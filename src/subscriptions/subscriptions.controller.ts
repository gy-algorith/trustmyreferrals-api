import { Controller, Get, Post, Delete, Body, Param, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User as UserDecorator } from '../common/decorators/user.decorator';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get all subscription plans', description: 'Retrieves all active subscription plans, optionally filtered by role' })
  @ApiResponse({ status: 200, description: 'Subscription plans retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllPlans(@Query('role') role?: UserRole) {
    if (role) {
      return this.subscriptionsService.getPlansByRole(role);
    }
    return this.subscriptionsService.getAllActivePlans();
  }

  @Get('my-subscription')
  @ApiOperation({ summary: 'Get current user subscription', description: 'Retrieves the current user\'s subscription status and plan details' })
  @ApiResponse({ status: 200, description: 'Subscription retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getMySubscription(@UserDecorator() user: { id: string }) {
    return this.subscriptionsService.getUserSubscription(user.id);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Create subscription checkout session', description: 'Creates a Stripe checkout session for subscription purchase' })
  @ApiResponse({ status: 201, description: 'Checkout session created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid plan or interval' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async createSubscriptionCheckout(
    @UserDecorator() user: { id: string },
    @Body() body: {
      planCode: string;
      successUrl: string;
      cancelUrl: string;
      interval?: 'month' | 'year';
    }
  ) {
    return this.subscriptionsService.createSubscriptionCheckout({
      userId: user.id,
      planCode: body.planCode,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
      interval: body.interval,
    });
  }

  @Delete('cancel')
  @ApiOperation({ summary: 'Cancel current subscription', description: 'Cancels the current user\'s active subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - no active subscription' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async cancelSubscription(@UserDecorator() user: { id: string }) {
    return this.subscriptionsService.cancelSubscription(user.id);
  }

  @Post('portal')
  @ApiOperation({ summary: 'Redirect to Stripe Customer Portal', description: 'Creates a session to redirect user to Stripe Customer Portal for subscription management' })
  @ApiResponse({ status: 201, description: 'Portal session created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - no Stripe customer found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async redirectToCustomerPortal(
    @UserDecorator() user: { id: string }
  ) {
    return this.subscriptionsService.redirectToCustomerPortal(user.id);
  }
}
