export function getImagePath(imagePath: string) {
    const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL;
    return baseUrl + imagePath
}