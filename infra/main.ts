import { Construct } from 'constructs';
import { App, TerraformStack } from 'cdktf';
import { GoogleProvider } from '@cdktf/provider-google/lib/provider';
import { StorageBucket } from '@cdktf/provider-google/lib/storage-bucket';
import { StorageBucketIamMember } from '@cdktf/provider-google/lib/storage-bucket-iam-member';
import { ServiceAccount } from '@cdktf/provider-google/lib/service-account';
import { ProjectIamMember } from '@cdktf/provider-google/lib/project-iam-member';
import { SecretManagerSecretIamMember } from '@cdktf/provider-google/lib/secret-manager-secret-iam-member';
import { CloudRunV2Job } from '@cdktf/provider-google/lib/cloud-run-v2-job';
import { CloudRunV2JobIamMember } from '@cdktf/provider-google/lib/cloud-run-v2-job-iam-member';
import { CloudSchedulerJob } from '@cdktf/provider-google/lib/cloud-scheduler-job';
import { IamWorkloadIdentityPool } from '@cdktf/provider-google/lib/iam-workload-identity-pool';
import { IamWorkloadIdentityPoolProvider } from '@cdktf/provider-google/lib/iam-workload-identity-pool-provider';
import { ServiceAccountIamMember } from '@cdktf/provider-google/lib/service-account-iam-member';

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
    // WIF が認可する `<owner>/<repo>`。principal:// subject に展開される。
    // 誤値だと WIF binding 全体が意味を成さないため必須化。
    const githubRepository = requireEnv('GITHUB_REPOSITORY');
    // WIF principal:// URL の構築に必須。誤った projectNumber を指定すると
    // 別プロジェクトの pool に binding しようとして失敗する。
    const projectNumber = requireEnv('GCP_PROJECT_NUMBER');

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
              image: `${region}-docker.pkg.dev/${projectId}/toique/backup:latest`,
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
        uri: `https://${region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${projectId}/jobs/${backupJob.name}:run`,
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
  }
}

const app = new App();
new MyStack(app, 'toique-infra');
app.synth();
