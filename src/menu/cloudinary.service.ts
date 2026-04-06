import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private configured = false;

  constructor(private readonly config: ConfigService) {}

  private ensureConfigured(): void {
    if (this.configured) {
      return;
    }
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME')?.trim();
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY')?.trim();
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET')?.trim();
    if (!cloudName || !apiKey || !apiSecret) {
      throw new BadRequestException(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the environment.',
      );
    }
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    this.configured = true;
  }

  /**
   * Uploads an image buffer to Cloudinary and returns the HTTPS URL.
   */
  async uploadMenuImage(file: Express.Multer.File): Promise<string> {
    this.ensureConfigured();
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    try {
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: 'snapserve/menu-items',
        resource_type: 'image',
      });
      if (!result.secure_url) {
        throw new BadRequestException(
          'Cloudinary image upload failed: no secure URL was returned.',
        );
      }
      return result.secure_url;
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(
        `Cloudinary image upload failed: ${msg}`,
      );
    }
  }
}
