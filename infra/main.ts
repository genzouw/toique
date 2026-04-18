import { Construct } from 'constructs';
import { App, TerraformStack } from 'cdktf';
import { GoogleProvider } from '@cdktf/provider-google/lib/provider';
import { StorageBucket } from '@cdktf/provider-google/lib/storage-bucket';

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const projectId = 'toique-app-prod';
    const region = 'asia-northeast1';

    new GoogleProvider(this, 'Google', {
      project: projectId,
      region: region,
    });

    new StorageBucket(this, 'backup-bucket', {
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
  }
}

const app = new App();
new MyStack(app, 'toique-infra');
app.synth();
