export function getImagePath(imagePath: string) {
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || '';
    return baseUrl + imagePath
}