import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { appEnv, isMockStorageMode } from "@/lib/env";

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: appEnv.R2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: appEnv.R2_ACCESS_KEY_ID!,
      secretAccessKey: appEnv.R2_SECRET_ACCESS_KEY!
    }
  });
}

function buildObjectKey(fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").toLowerCase();
  return `uploads/${Date.now()}-${safeName}`;
}

export async function createUploadSignature(fileName: string, contentType: string) {
  if (isMockStorageMode()) {
    return {
      mode: "mock" as const,
      uploadUrl: null,
      publicUrl: null
    };
  }

  const objectKey = buildObjectKey(fileName);
  const command = new PutObjectCommand({
    Bucket: appEnv.R2_BUCKET,
    Key: objectKey,
    ContentType: contentType
  });

  return {
    mode: "r2" as const,
    uploadUrl: await getSignedUrl(getR2Client(), command, { expiresIn: 60 * 5 }),
    publicUrl: `${appEnv.R2_PUBLIC_BASE_URL}/${objectKey}`
  };
}

export async function uploadObjectToR2(fileName: string, contentType: string, body: Uint8Array) {
  if (isMockStorageMode()) {
    throw new Error("当前环境还没有启用真实对象存储。");
  }

  const objectKey = buildObjectKey(fileName);
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: appEnv.R2_BUCKET,
      Key: objectKey,
      ContentType: contentType,
      Body: body
    })
  );

  return {
    objectKey,
    publicUrl: `${appEnv.R2_PUBLIC_BASE_URL}/${objectKey}`
  };
}
