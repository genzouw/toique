import { Construct } from 'constructs';
import { App, TerraformStack } from 'cdktf';
import { GoogleProvider } from '@cdktf/provider-google/lib/provider';
import { StorageBucket } from '@cdktf/provider-google/lib/storage-bucket';
import { StorageBucketIamMember } from '@cdktf/provider-google/lib/storage-bucket-iam-member';
import { ServiceAccount } from '@cdktf/provider-google/lib/service-account';
import { ProjectIamMember } from '@cdktf/provider-google/lib/project-iam-member';
import { SecretManagerSecretIamMember } from '@cdktf/provider-google/lib/secret-manager-secret-iam-member';
import { CloudRunV2Job } from '@cdktf/provider-google/lib/cloud-run-v2-job';
import { CloudSchedulerJob } from '@cdktf/provider-google/lib/cloud-scheduler-job';

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const projectId = 'toique-app-prod';
    const region = 'asia-northeast1';

    // バックアップジョブが参照するシークレット定義（env 名と Secret Manager 上の名前のマッピング）
    const backupSecrets = [
      { envName: 'POSTGRES_DB', secretName: 'BACKUP_POSTGRES_DB' },
      { envName: 'POSTGRES_USER', secretName: 'BACKUP_POSTGRES_USER' },
      { envName: 'POSTGRES_PASSWORD', secretName: 'BACKUP_POSTGRES_PASSWORD' },
      { envName: 'POSTGRES_HOST', secretName: 'BACKUP_POSTGRES_HOST' },
    ];

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

    // Cloud Run Job 実行権限 (Cloud Scheduler が使用)
    new ProjectIamMember(this, 'backup-sa-run-invoker', {
      project: projectId,
      role: 'roles/run.developer',
      member: `serviceAccount:${backupSa.email}`,
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
  }
}

const app = new App();
new MyStack(app, 'toique-infra');
app.synth();
