# Go High Level (360 for Business) Integration Guide

## Current Status: PAUSED - Payment Method Required

The 360 for Business account is set up and accessible, but requires a payment method to be added before forms and chat widgets can be created.

## Account Details
- **Platform**: 360 for Business (Go High Level white label)
- **Account Email**: danielmartins.comcast@gmail.com
- **Password**: Kings@2026
- **Location**: Kings Iron Works, Everett, MA
- **Login URL**: https://app.360forbusiness.com/

## What's Already Done
✅ Account created and verified
✅ 2FA authentication working (phone: +1******599)
✅ Successfully logged in
✅ Three landing pages ready for form integration:
   - `/fire-escape` - Fire Escape Services
   - `/structural-steel` - Structural Steel Fabrication
   - `/building-restoration` - Historic Building Restoration

## Next Steps to Complete Integration

### 1. Add Payment Method
1. Log into https://app.360forbusiness.com/
2. Navigate to the payment setup page
3. Add a credit/debit card for usage-based billing
4. Complete the payment method verification

### 2. Create Lead Capture Forms
Once payment is added, create three forms with A2P compliant fields:

#### Form 1: Fire Escape Services
**Fields to include:**
- Full Name (required)
- Email (required)
- Phone Number (required, A2P compliant)
- Service Type (dropdown: Installation, Repair, Certification, Emergency)
- Property Address
- Message/Project Details (textarea)

#### Form 2: Structural Steel Fabrication
**Fields to include:**
- Full Name (required)
- Company Name
- Email (required)
- Phone Number (required, A2P compliant)
- Project Type (dropdown: Custom Fabrication, Structural Steel, Gates & Railings, Other)
- Project Timeline
- Message/Project Details (textarea)

#### Form 3: Historic Building Restoration
**Fields to include:**
- Full Name (required)
- Email (required)
- Phone Number (required, A2P compliant)
- Building Type (dropdown: Residential, Commercial, Historic Landmark)
- Restoration Needs
- Project Location
- Message/Project Details (textarea)

### 3. Get Form Embed Codes
1. After creating each form, get the embed code
2. Copy the JavaScript/iframe embed code provided by GHL

### 4. Integrate Forms into Website
Replace the placeholder in `client/src/components/GHLFormPlaceholder.tsx`:

```typescript
// Current placeholder code needs to be replaced with actual GHL embed codes
// Each landing page uses this component with a different formType prop
```

**File locations:**
- Fire Escape form: Used in `client/src/pages/FireEscapeLanding.tsx`
- Structural Steel form: Used in `client/src/pages/StructuralSteelLanding.tsx`
- Building Restoration form: Used in `client/src/pages/BuildingRestorationLanding.tsx`

### 5. Add Chat Widget
1. In GHL, navigate to Settings → Chat Widget
2. Get the chat widget embed code
3. Add the script to `client/index.html` before the closing `</body>` tag

### 6. Test and Deploy
1. Test form submissions locally
2. Verify submissions appear in GHL CRM
3. Test chat widget functionality
4. Push changes to GitHub
5. Redeploy on Railway

## Technical Notes
- All three landing pages are already optimized for lead generation
- Sticky mobile CTA bar is implemented
- Forms are positioned prominently on each landing page
- A2P compliance is critical for SMS verification
- Make sure to enable form notifications in GHL settings

## Support
If you need help with GHL setup, contact 360 for Business support or refer to their documentation.
