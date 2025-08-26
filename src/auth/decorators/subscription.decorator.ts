import { SetMetadata } from '@nestjs/common';


export const SUBSCRIPTION_KEY = 'subscription';
export const Subscription = (...subscriptions: string[]) => 
  SetMetadata(SUBSCRIPTION_KEY, subscriptions);
