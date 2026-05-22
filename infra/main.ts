import * as fs from 'fs';
import * as path from 'path';
import { Construct } from 'constructs';
import { App, TerraformStack, GcsBackend } from 'cdktf';
import { GoogleProvider } from '@cdktf/provider-google/lib/provider';
import { StorageBucket } from '@cdktf/provider-google/lib/storage-bucket';
import { StorageBucketIamMember } from '@cdktf/provider-google/lib/storage-bucket-iam-member';
import { ServiceAccount } from '@cdktf/provider-google/lib/service-account';
import { ProjectIamMember } from '@cdktf/provider-google/lib/project-iam-member';
import { SecretManagerSecret } from '@cdktf/provider-google/lib/secret-manager-secret';
import { SecretManagerSecretIamMember } from '@cdktf/provider-google/lib/secret-manager-secret-iam-member';
import { CloudRunV2Job } from '@cdktf/provider-google/lib/cloud-run-v2-job';
import { CloudRunV2JobIamMember } from '@cdktf/provider-google/lib/cloud-run-v2-job-iam-member';
import { CloudSchedulerJob } from '@cdktf/provider-google/lib/cloud-scheduler-job';
import { IamWorkloadIdentityPool } from '@cdktf/provider-google/lib/iam-workload-identity-pool';
import { IamWorkloadIdentityPoolProvider } from '@cdktf/provider-google/lib/iam-workload-identity-pool-provider';
import { ServiceAccountIamMember } from '@cdktf/provider-google/lib/service-account-iam-member';
import { ArtifactRegistryRepository } from '@cdktf/provider-google/lib/artifact-registry-repository';

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // env のうち、ダミー値で synth/apply されると本番に dead な trust binding を
    // 仕込む恐れがあるものは必須化する (fail fast)。
    const requireEnv = (name: string): string => {
      const value = process.env[name]?.trim();
      if (!value) {
        throw new Error(
          `${name} is required for cdktf synth/deploy. Set it as an environment variable before running.`,
        );
      }
      return value;
    };

    const projectId = process.env.GCP_PROJECT_ID || 'example-project-id';
    const region = process.env.GCP_REGION || 'asia-northeast1';
    // Artifact Registry リポジトリ名。Cloud Run Job の image 参照と
    // ArtifactRegistryRepository の repositoryId で共通利用する。
    // 既定値を変えると pull 先とリポジトリ作成先がズレるため両者で必ず同じ変数を参照する。
    const artifactRepoName = process.env.ARTIFACT_REPO || 'toique';
    // WIF が認可する `<owner>/<repo>`。principal:// subject に展開される。
    // 誤値だと WIF binding 全体が意味を成さないため必須化。
    const githubRepository = requireEnv('GITHUB_REPOSITORY');
    // WIF principal:// URL の構築に必須。誤った projectNumber を指定すると
    // 別プロジェクトの pool に binding しようとして失敗する。
    const projectNumber = requireEnv('GCP_PROJECT_NUMBER');

    // Terraform state を保管する GCS バケット名。公開リポジトリのため
    // バケット名はコードに直書きせず環境変数で外部化する。
    const tfStateBucket = requireEnv('TF_STATE_BUCKET');

    // --- Terraform Backend (GCS) ---
    // ローカル state は端末故障で消失するリスクがあるため、CDKTF 管理の state は
    // GCS バケットで一元化する。Backend バケット自体は CDKTF 管理外で先行作成し
    // (chicken-and-egg 回避)、Versioning + Lifecycle で state 履歴を保護する。
    new GcsBackend(this, {
      bucket: tfStateBucket,
      prefix: id,
    });

    // バックアップジョブが参照するシークレット定義（env 名と Secret Manager 上の名前のマッピング）
    const backupSecrets = [
      { envName: 'POSTGRES_DB', secretName: 'BACKUP_POSTGRES_DB' },
      { envName: 'POSTGRES_USER', secretName: 'BACKUP_POSTGRES_USER' },
      { envName: 'POSTGRES_PASSWORD', secretName: 'BACKUP_POSTGRES_PASSWORD' },
      { envName: 'POSTGRES_HOST', secretName: 'BACKUP_POSTGRES_HOST' },
    ] as const;

    new GoogleProvider(this, 'Google', {
      project: projectId,
      region: region,
    });

    // --- GCS バケット ---
    const backupBucket = new StorageBucket(this, 'backup-bucket', {
      name: `${projectId}-db-backups`,
      location: region,
      storageClass: 'STANDARD',
      lifecycleRule: [
        {
          action: {
            type: 'Delete',
          },
          condition: {
            age: 30,
          },
        },
      ],
      forceDestroy: false,
    });

    // --- バックアップ用サービスアカウント ---
    const backupSa = new ServiceAccount(this, 'backup-sa', {
      accountId: 'backup-job',
      displayName: 'DB Backup Cloud Run Job',
      project: projectId,
    });

    // GCS 書き込み権限（バックアップ用バケット限定）
    new StorageBucketIamMember(this, 'backup-sa-bucket-writer', {
      bucket: backupBucket.name,
      role: 'roles/storage.objectCreator',
      member: `serviceAccount:${backupSa.email}`,
    });

    // Cloud Run Job 実行権限。
    // Job リソース単位の IAM binding は対象リソースの定義が必要なため、
    // backupJob の宣言後に定義している。

    // --- Secret Manager シークレット本体の定義 ---
    // 既存の手動作成シークレットは `terraform import` で CDKTF 管理下に取り込む。
    // シークレット値は CDKTF で管理せず、値の更新は別の運用フローで行う。
    backupSecrets.forEach(({ secretName }) => {
      new SecretManagerSecret(this, `backup-secret-${secretName}`, {
        project: projectId,
        secretId: secretName,
        replication: {
          auto: {},
        },
      });
    });

    // Secret Manager 読み取り権限（バックアップ用シークレット限定）
    backupSecrets.forEach(({ secretName }) => {
      new SecretManagerSecretIamMember(this, `backup-sa-secret-${secretName}`, {
        project: projectId,
        secretId: secretName,
        role: 'roles/secretmanager.secretAccessor',
        member: `serviceAccount:${backupSa.email}`,
      });
    });

    // --- Cloud Run Jobs ---
    const backupJob = new CloudRunV2Job(this, 'backup-job', {
      name: 'db-backup',
      location: region,
      project: projectId,
      template: {
        template: {
          serviceAccount: backupSa.email,
          timeout: '600s',
          containers: [
            {
              image: `${region}-docker.pkg.dev/${projectId}/${artifactRepoName}/backup:latest`,
              resources: {
                limits: {
                  cpu: '1',
                  memory: '512Mi',
                },
              },
              env: [
                {
                  name: 'GCS_BUCKET',
                  value: `${projectId}-db-backups`,
                },
                ...backupSecrets.map(({ envName, secretName }) => ({
                  name: envName,
                  valueSource: {
                    secretKeyRef: {
                      secret: secretName,
                      version: 'latest',
                    },
                  },
                })),
              ],
            },
          ],
        },
      },
    });

    // backupSa は Cloud Scheduler が `db-backup` Job を発火するときの
    // OAuth identity として使われる (CloudSchedulerJob.httpTarget.oauthToken)。
    // 最小権限の原則 (PoLP) に基づき、権限をこの Job リソース単位に限定する。
    //
    // `IamMember` (additive) を使い、Terraform 管理外の手動 binding を踏み潰さない。
    // `IamPolicy` (authoritative) は既存 binding を全消去するため、
    // infra/README.md の手動 IAM 削除手順と組み合わせるとリスクが大きい。
    new CloudRunV2JobIamMember(this, 'backup-sa-run-invoker', {
      project: projectId,
      location: region,
      name: backupJob.name,
      role: 'roles/run.invoker',
      member: `serviceAccount:${backupSa.email}`,
    });

    // --- Cloud Scheduler ---
    new CloudSchedulerJob(this, 'backup-scheduler', {
      name: 'db-backup-daily',
      region: region,
      project: projectId,
      description: 'Daily database backup at 3:00 AM JST',
      schedule: '0 3 * * *',
      timeZone: 'Asia/Tokyo',
      httpTarget: {
        uri: `https://${backupJob.location}-run.googleapis.com/v2/projects/${backupJob.project}/locations/${backupJob.location}/jobs/${backupJob.name}:run`,
        httpMethod: 'POST',
        oauthToken: {
          serviceAccountEmail: backupSa.email,
        },
      },
    });

    // =========================================================================
    // Workload Identity Federation (GitHub Actions OIDC)
    // =========================================================================
    // GitHub Actions が GCP リソースにアクセスするための WIF Pool / Provider / SA。
    // 元々 gcloud で手動構築していたものを IaC 化し、attribute_condition と
    // principalSet の双方を厳格化することで、Public 化後の運用ミス耐性を高める。
    //
    // 既存リソースの import 手順は infra/README.md を参照。
    // =========================================================================

    // --- WIF Pool ---
    const githubPool = new IamWorkloadIdentityPool(this, 'github-pool', {
      project: projectId,
      workloadIdentityPoolId: 'github-pool',
      displayName: 'GitHub Actions Pool',
      description: 'WIF pool for GitHub Actions OIDC',
    });

    // --- WIF Provider (OIDC) ---
    //
    // attribute_condition で `<owner>/<repo>` リポジトリ かつ main ブランチからの
    // OIDC のみ許可する。同オーナーの他リポ・他ブランチ・タグ・PR からは
    // WIF を発行できないため、漏えい時の攻撃面が最小化される。
    new IamWorkloadIdentityPoolProvider(this, 'github-provider', {
      project: projectId,
      workloadIdentityPoolId: githubPool.workloadIdentityPoolId,
      workloadIdentityPoolProviderId: 'github-provider',
      displayName: 'GitHub Actions OIDC',
      description: 'OIDC provider for GitHub Actions',
      oidc: {
        issuerUri: 'https://token.actions.githubusercontent.com',
      },
      attributeMapping: {
        'google.subject': 'assertion.sub',
        'attribute.repository': 'assertion.repository',
        'attribute.repository_owner': 'assertion.repository_owner',
        'attribute.ref': 'assertion.ref',
      },
      attributeCondition: `assertion.repository == '${githubRepository}' && assertion.ref == 'refs/heads/main'`,
    });

    // --- GitHub Actions デプロイ用 Service Account ---
    const githubDeployerSa = new ServiceAccount(this, 'github-deployer-sa', {
      accountId: 'github-deployer',
      displayName: 'GitHub Actions Deployer',
      project: projectId,
    });

    // 必要な role を Project レベルで付与。
    // `roles/iam.serviceAccountUser` は Project-wide だと「プロジェクト内任意の SA を
    // Cloud Run runtime として attach できる」権限になり、deployer が認証に成功した
    // 後に backup-sa 等の高権限 SA を impersonate する経路を残してしまう。
    // 代わりに後段で runtime SA 単位の ServiceAccountIamMember として絞る。
    const deployerRoles = [
      'roles/run.admin', // Cloud Run service / job のデプロイ
      'roles/artifactregistry.writer', // Docker image push
      'roles/secretmanager.secretAccessor', // Secret Manager から secret 取得
    ] as const;
    deployerRoles.forEach((role) => {
      // role 名にスラッシュが含まれるのでリソース ID には末尾部分のみ使う
      const safeId = role.split('/')[1].replace(/\./g, '-');
      new ProjectIamMember(this, `github-deployer-${safeId}`, {
        project: projectId,
        role,
        member: `serviceAccount:${githubDeployerSa.email}`,
      });
    });

    // --- runtime SA への SA User 権限 (個別 binding で PoLP) ---
    //
    // Cloud Run service (toique-backend) は --service-account 指定なしで動いており、
    // GCP デフォルトの Compute Engine SA (<project_number>-compute@developer...) が
    // runtime として attach される。github-deployer はこの SA を attach できる
    // 必要がある。
    new ServiceAccountIamMember(this, 'github-deployer-compute-sa-user', {
      serviceAccountId: `projects/${projectId}/serviceAccounts/${projectNumber}-compute@developer.gserviceaccount.com`,
      role: 'roles/iam.serviceAccountUser',
      member: `serviceAccount:${githubDeployerSa.email}`,
    });

    // db-backup Cloud Run Job の runtime である backupSa に対しても attach 権限が必要。
    new ServiceAccountIamMember(this, 'github-deployer-backup-sa-user', {
      serviceAccountId: backupSa.name,
      role: 'roles/iam.serviceAccountUser',
      member: `serviceAccount:${githubDeployerSa.email}`,
    });

    // --- WIF → SA binding ---
    //
    // principal:// (subject 単位) で `repo:<owner>/<repo>:ref:refs/heads/main` を
    // 唯一の許可 subject にする。GitHub Actions の OIDC `sub` claim はデフォルトで
    // `repo:<owner>/<repo>:ref:<ref>` 形式のため、binding 自体が **特定リポジトリの
    // main ブランチからの OIDC** にしか対応しなくなる。
    //
    // attribute_condition と principal subject の二重で repository + branch を
    // ガードする多層防御 (defense-in-depth)。OIDC token customization で sub
    // フォーマットを変えた場合は本 binding も合わせて更新する必要がある。
    new ServiceAccountIamMember(this, 'github-deployer-wif-binding', {
      serviceAccountId: githubDeployerSa.name,
      role: 'roles/iam.workloadIdentityUser',
      member: `principal://iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${githubPool.workloadIdentityPoolId}/subject/repo:${githubRepository}:ref:refs/heads/main`,
    });

    // --- Artifact Registry リポジトリ定義とクリーンアップポリシーの設定 ---
    // クリーンアップポリシー: GCP の仕様では KEEP ルールが DELETE ルールよりも優先評価される。
    // そのため keep-latest-10 にマッチする最新 10 バージョンは何があっても保護され、
    // それ以外のイメージが UNTAGGED (1 日経過) / 30 日経過の DELETE ルールで掃除される。
    //
    // ポリシーの定義は `infra/gcp-cleanup-policy.json` を Single Source of Truth とし、
    // gcloud (docs/fork-setup.md の quick start) と CDKTF (本ファイル) の両方が
    // 同一の JSON を参照することで二重管理を排除している。
    new ArtifactRegistryRepository(this, 'artifact-repo', {
      project: projectId,
      location: region,
      repositoryId: artifactRepoName,
      format: 'DOCKER',
      cleanupPolicies: loadCleanupPolicies(),
    });
  }
}

// gcp-cleanup-policy.json (gcloud `set-cleanup-policies --policy=...` 用フォーマット) を
// CDKTF の `cleanupPolicies` 期待スキーマに変換する。両者は同じ意味だが構造が異なる:
//   JSON: { id, action: { type: 'Keep' | 'Delete' }, ... }
//   CDK : { id, action: 'KEEP' | 'DELETE', ... }
// fail-fast で typo 等の不正値は synth 段階で検出する。
interface RawCleanupPolicy {
  id: string;
  action?: { type?: string };
  mostRecentVersions?: { keepCount: number };
  condition?: { tagState: string; olderThan: string };
}

interface CleanupPolicy {
  id: string;
  action: string;
  mostRecentVersions?: { keepCount: number };
  condition?: { tagState: string; olderThan: string };
}

function loadCleanupPolicies(): CleanupPolicy[] {
  const jsonPath = path.resolve(__dirname, 'gcp-cleanup-policy.json');
  let raw: RawCleanupPolicy[];
  try {
    const content = fs.readFileSync(jsonPath, 'utf8');
    raw = JSON.parse(content);
  } catch (err) {
    throw new Error(
      `Failed to load cleanup policies from ${jsonPath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return raw.map((p) => {
    const actionType = p.action?.type;
    if (!actionType) {
      throw new Error(
        `Missing action.type in cleanup policy "${p.id}". Expected "Keep" or "Delete".`,
      );
    }
    const action = actionType.toUpperCase();
    if (action !== 'KEEP' && action !== 'DELETE') {
      throw new Error(
        `Invalid action.type "${actionType}" in cleanup policy "${p.id}". Expected "Keep" or "Delete".`,
      );
    }
    return {
      id: p.id,
      action,
      ...(p.mostRecentVersions
        ? { mostRecentVersions: p.mostRecentVersions }
        : {}),
      ...(p.condition ? { condition: p.condition } : {}),
    };
  });
}

const app = new App();
new MyStack(app, 'toique-infra');
app.synth();
