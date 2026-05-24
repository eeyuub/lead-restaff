import { SetMetadata } from '@nestjs/common';

// Mark a route as public (skips the API-key guard). Used for the Apify webhook.
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
