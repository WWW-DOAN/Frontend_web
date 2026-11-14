import { IUploadedMedia, UploadMediaParams } from "../interface/media-interface";

export type MediaVisibility = "public" | "private";
export type AttachmentType = "image" | "video" | "audio" | "document";

const getAccessTokenFromLocal = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
};

function getCloudinaryResourceType(mimeType: string): 'image' | 'video' | 'raw' {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/") || mimeType.startsWith("audio/")) return "video";
  return "raw";
}

function getAttachmentType(mimeType: string): AttachmentType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

export async function uploadMedia({
  file,
  userId,
}: UploadMediaParams): Promise<IUploadedMedia> {
  const token = getAccessTokenFromLocal();
  if (!token) {
    throw new Error("Không tìm thấy access token");
  }

  const resourceType = getCloudinaryResourceType(file.type);
  const needsAttachmentTransform = resourceType === "raw";

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4321";

  // Thử upload qua Cloudinary nếu backend cung cấp chữ ký
  try {
    const signRes = await fetch(`${baseUrl}/api/media/cloudinary-sign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        resourceType,
        transformation: needsAttachmentTransform ? "fl_attachment" : undefined,
      }),
    });

    if (signRes.ok) {
      const signJson = await signRes.json();
      const signData = signJson?.data ?? signJson;

      if (signData?.signature && signData?.uploadUrl) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("signature", signData.signature);
        formData.append("timestamp", String(signData.timestamp));
        formData.append("api_key", signData.apiKey);
        if (signData.folder) {
          formData.append("folder", signData.folder);
        }
        if (signData.transformation) {
          formData.append("transformation", signData.transformation);
        }

        const uploadRes = await fetch(signData.uploadUrl, {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const result = await uploadRes.json();
          if (!result.error) {
            const uploadedUrl = result.secure_url || result.url;
            return {
              key: result.public_id,
              url: uploadedUrl,
              visibility: "public",
              thumbnailKey: resourceType === "video" ? (result.secure_url || result.url) : undefined,
              contentType: file.type,
              fileName: file.name,
              size: result.bytes || file.size,
              type: getAttachmentType(file.type),
            };
          }
        }
      }
    }
  } catch (cloudErr) {
    console.warn("[uploadMedia] Cloudinary upload unavailable, falling back to local server upload:", cloudErr);
  }

  // Fallback: Upload trực tiếp lên backend /api/media/upload
  const fallbackFormData = new FormData();
  fallbackFormData.append("file", file);

  const localRes = await fetch(`${baseUrl}/api/media/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: fallbackFormData,
  });

  if (!localRes.ok) {
    const errText = await localRes.text().catch(() => "");
    throw new Error(errText || "Tải lên tệp thất bại");
  }

  const localJson = await localRes.json();
  const localData = localJson?.data ?? localJson;

  return {
    key: localData.key || localData.id || `local-${Date.now()}`,
    url: localData.url || "",
    visibility: "public",
    thumbnailKey: undefined,
    contentType: file.type,
    fileName: file.name,
    size: file.size,
    type: getAttachmentType(file.type),
  };
}

export async function uploadManyMedia(
  files: File[],
  userId: string,
  conversationId?: string
): Promise<IUploadedMedia[]> {
  return Promise.all(
    files.map((file) =>
      uploadMedia({
        file,
        userId,
        conversationId,
      })
    )
  );
}
