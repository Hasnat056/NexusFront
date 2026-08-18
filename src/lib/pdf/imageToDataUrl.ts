/** jsPDF's addImage() needs a data URL (or raw base64), not a remote URL — fetches and converts,
 * falling back to null (→ initials) on any failure, e.g. a CORS-blocked host. This student's mock
 * `image` is always null today, so this path isn't exercised yet, but it makes the photo box
 * correct for the day a real upload URL shows up instead of silently breaking the PDF. */
export async function imageToDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
