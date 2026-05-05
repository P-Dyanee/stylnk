import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

export interface ImageUploadResult {
  uri: string;
  base64: string;
  mimeType: string;
  size: number;
}

export class ImageUploadHelper {
  static async checkPermissions(): Promise<boolean> {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Please allow photo library access to upload images."
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error("Permission check failed:", error);
      return false;
    }
  }

  static async pickImage(options?: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
    maxSizeMB?: number;
  }): Promise<ImageUploadResult | null> {
    const hasPermission = await this.checkPermissions();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options?.allowsEditing ?? true,
        aspect: options?.aspect ?? [1, 1],
        quality: options?.quality ?? 0.6, // Reduced quality for faster upload
        base64: true,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      const asset = result.assets[0];
      
      if (!asset.uri || !asset.base64) {
        Alert.alert("Error", "Failed to process image. Please try another image.");
        return null;
      }

      // Check file size (base64 is ~33% larger)
      const estimatedSize = (asset.base64.length * 3) / 4; // Rough estimate
      const maxSizeBytes = (options?.maxSizeMB ?? 2) * 1024 * 1024; // Reduced to 2MB
      
      if (estimatedSize > maxSizeBytes) {
        Alert.alert(
          "File too large", 
          `Image size must be less than ${options?.maxSizeMB ?? 2}MB for faster upload.`
        );
        return null;
      }

      return {
        uri: asset.uri,
        base64: asset.base64,
        mimeType: asset.mimeType || "image/jpeg",
        size: estimatedSize,
      };
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
      return null;
    }
  }

  static createDataUrl(image: ImageUploadResult): string {
    return `data:${image.mimeType};base64,${image.base64}`;
  }
}
