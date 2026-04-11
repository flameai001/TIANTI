import "server-only";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { appEnv, isMockStorageMode } from "@/lib/env";

export async function createUploadSignature(fileName: string, contentType: string) {
  if (isMockStorageMode()) {
    return {
      mode: "mock" as const,
      uploadUrl: null,
      publicUrl: null
    };
  }

  const client = new S3Client({
    region: "auto",
    endpoint: appEnv.R2_ENDPOINT,
    credentials: {
      accessKeyId: appEnv.R2_ACCESS_KEY_ID!,
      secretAccessKey: appEnv.R2_SECRET_ACCESS_KEY!
    }
  });

  const objectKey = `uploads/${Date.now()}-${fileName.replace(/\s+/g, "-").toLowerCase()}`;
  const command = new PutObjectCommand({
    Bucket: appEnv.R2_BUCKET,
    Key: objectKey,
    ContentType: contentType
  });

  return {
    mode: "r2" as const,
    uploadUrl: await getSignedUrl(client, command, { expiresIn: 60 * 5 }),
    publicUrl: `${appEnv.R2_PUBLIC_BASE_URL}/${objectKey}`
  };
}
