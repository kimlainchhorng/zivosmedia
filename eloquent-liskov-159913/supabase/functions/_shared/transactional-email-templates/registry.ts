/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { template as partnerStoreIdRecovery } from './partner-store-id-recovery.tsx'
import { template as partnerStoreInvite } from './partner-store-invite.tsx'
import { template as employeeInvite } from './employee-invite.tsx'
import { template as lodgingReceiptReady } from './lodging-receipt-ready.tsx'
import { template as lodgingAddonStatus } from './lodging-addon-status.tsx'
import { template as lodgingCancellationUpdate } from './lodging-cancellation-update.tsx'
import { template as lodgingRescheduleUpdate } from './lodging-reschedule-update.tsx'
import { template as lodgingBookingConfirmed } from './lodging-booking-confirmed.tsx'
import { template as eatsOrderConfirmed } from './eats-order-confirmed.tsx'
import { template as lodgingRefundIssued } from './lodging-refund-issued.tsx'
import { template as eatsRefundIssued } from './eats-refund-issued.tsx'
import { template as groceryOrderConfirmed } from './grocery-order-confirmed.tsx'
import { template as newDeviceLogin } from './new-device-login.tsx'
import { template as countryChangeLogin } from './country-change-login.tsx'
import { template as notificationGeneric } from './notification-generic.tsx'

export type TemplateEntry<Props = Record<string, unknown>> = {
  component: React.ComponentType<Props>
  subject: string | ((props: Props) => string)
  displayName?: string
  previewData?: Props
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry<any>> = {
  'partner-store-id-recovery': partnerStoreIdRecovery,
  'partner-store-invite': partnerStoreInvite,
  'employee-invite': employeeInvite,
  'lodging-receipt-ready': lodgingReceiptReady,
  'lodging-addon-status': lodgingAddonStatus,
  'lodging-cancellation-update': lodgingCancellationUpdate,
  'lodging-reschedule-update': lodgingRescheduleUpdate,
  'lodging-booking-confirmed': lodgingBookingConfirmed,
  'eats-order-confirmed': eatsOrderConfirmed,
  'lodging-refund-issued': lodgingRefundIssued,
  'eats-refund-issued': eatsRefundIssued,
  'grocery-order-confirmed': groceryOrderConfirmed,
  'new-device-login': newDeviceLogin,
  'country-change-login': countryChangeLogin,
  'notification-generic': notificationGeneric,
}

/**
 * Aliases — many event_types from notify-dispatch don't have a bespoke
 * template (ride status, marketplace updates, creator subscriber events,
 * social activity, channel posts, etc.). Map them all to the generic
 * fallback so we never silently drop the email.
 */
const GENERIC_FALLBACK_PREFIXES = [
  'ride_',
  'eats_order_',          // bespoke template only covers `eats-order-confirmed`
  'lodge_booking_',       // bespoke covers `lodging-booking-confirmed`
  'flight_booking_',
  'marketplace_order_',
  'wallet_',
  'creator_',
  'social_',
  'channel_',
  'chat_',
  'bot_',
  'group_',
] as const

for (const prefix of GENERIC_FALLBACK_PREFIXES) {
  // Register the prefix itself as an alias so any future direct match
  // hits the generic — bespoke templates registered above keep precedence.
  TEMPLATES[prefix] = TEMPLATES[prefix] ?? notificationGeneric
}

// Proxy lookup so any unknown templateName falls back to the generic
// renderer rather than 404'ing — guarantees notify-dispatch's email path
// always succeeds for the stock event taxonomy. Bespoke templates above
// retain their identity and rendering logic.
export const TEMPLATES_WITH_FALLBACK: Record<string, TemplateEntry<any>> =
  new Proxy(TEMPLATES, {
    get(target, prop) {
      if (typeof prop !== 'string') return Reflect.get(target, prop)
      if (prop in target) return target[prop]
      // Match any prefix in the fallback list.
      for (const pfx of GENERIC_FALLBACK_PREFIXES) {
        if (prop.startsWith(pfx)) return notificationGeneric
      }
      return undefined
    },
    has(target, prop) {
      if (typeof prop !== 'string') return prop in target
      if (prop in target) return true
      return GENERIC_FALLBACK_PREFIXES.some((p) => prop.startsWith(p))
    },
  })
