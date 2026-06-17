type DeleteImagesInput = {
  ids: string[];
};

export async function deleteImages({ ids }: DeleteImagesInput) {
  const response = await fetch("/api/image/delete-images", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ keys: ids }),
  });

  if (!response.ok) {
    const error =
      (await response.json().catch(() => null))?.error ??
      "Failed to delete images";

    throw new Error(error);
  }

  return response.json();
}
