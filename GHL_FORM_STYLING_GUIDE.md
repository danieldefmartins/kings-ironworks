# Go High Level Form Styling Guide
## Kings Ironworks - Industrial Heritage Brutalism Design

This guide will help you create a form in Go High Level that matches your website's design.

---

## Design System Overview

**Design Philosophy**: Industrial Heritage Brutalism
- **Colors**: Molten metal amber, raw steel, charcoal, warm cream
- **Typography**: Space Grotesk (headings) + Inter (body)
- **Style**: Bold borders, geometric shapes, industrial aesthetic

---

## Custom CSS for Go High Level Forms

Copy and paste this CSS into your Go High Level form's **Custom CSS** section:

```css
/* Kings Ironworks - Industrial Heritage Brutalism Form Styling */

/* Import fonts */
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;900&family=Inter:wght@400;500;600&display=swap');

/* Form container */
.ghl-form-container,
.elFormBody {
  font-family: 'Inter', sans-serif !important;
  background-color: #F9F7F4 !important; /* Warm cream */
  padding: 2rem !important;
  border: 8px solid #1E1E1E !important; /* Thick charcoal border */
  border-radius: 4px !important;
  max-width: 600px !important;
}

/* Form title/heading */
.elFormTitle,
.form-title,
h1, h2, h3 {
  font-family: 'Space Grotesk', sans-serif !important;
  font-weight: 900 !important;
  color: #1E1E1E !important; /* Deep charcoal */
  letter-spacing: -0.02em !important;
  line-height: 1.1 !important;
  margin-bottom: 1.5rem !important;
}

/* Form description */
.elFormDescription,
.form-description,
p {
  font-family: 'Inter', sans-serif !important;
  color: #3D3D3D !important;
  line-height: 1.7 !important;
  margin-bottom: 1.5rem !important;
}

/* Input labels */
.elFormItemLabel,
label {
  font-family: 'Inter', sans-serif !important;
  font-weight: 600 !important;
  color: #1E1E1E !important;
  margin-bottom: 0.5rem !important;
  display: block !important;
}

/* Input fields */
.elFormItemWrapper input[type="text"],
.elFormItemWrapper input[type="email"],
.elFormItemWrapper input[type="tel"],
.elFormItemWrapper input[type="number"],
.elFormItemWrapper textarea,
.elFormItemWrapper select,
input, textarea, select {
  font-family: 'Inter', sans-serif !important;
  background-color: #FFFFFF !important;
  border: 3px solid #1E1E1E !important; /* Bold border */
  border-radius: 2px !important; /* Minimal radius */
  padding: 0.75rem 1rem !important;
  font-size: 1rem !important;
  color: #1E1E1E !important;
  width: 100% !important;
  transition: all 0.2s ease !important;
}

/* Input focus state */
.elFormItemWrapper input:focus,
.elFormItemWrapper textarea:focus,
.elFormItemWrapper select:focus,
input:focus, textarea:focus, select:focus {
  outline: none !important;
  border-color: #B8860B !important; /* Warm amber */
  box-shadow: 0 0 0 3px rgba(184, 134, 11, 0.1) !important;
}

/* Submit button */
.elFormButton,
.elButton,
button[type="submit"],
.submit-button {
  font-family: 'Space Grotesk', sans-serif !important;
  font-weight: 700 !important;
  background-color: #B8860B !important; /* Warm amber */
  color: #F9F7F4 !important; /* Cream text */
  border: 3px solid #1E1E1E !important;
  border-radius: 2px !important;
  padding: 1rem 2rem !important;
  font-size: 1.125rem !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  width: 100% !important;
  margin-top: 1.5rem !important;
}

/* Submit button hover */
.elFormButton:hover,
.elButton:hover,
button[type="submit"]:hover,
.submit-button:hover {
  background-color: #9A7209 !important; /* Darker amber */
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

/* Error messages */
.elFormItemError,
.error-message {
  font-family: 'Inter', sans-serif !important;
  color: #DC2626 !important;
  font-size: 0.875rem !important;
  margin-top: 0.25rem !important;
}

/* Success message */
.elFormSuccessMessage,
.success-message {
  font-family: 'Inter', sans-serif !important;
  background-color: #10B981 !important;
  color: #FFFFFF !important;
  padding: 1rem !important;
  border-radius: 4px !important;
  border: 3px solid #1E1E1E !important;
  margin-top: 1rem !important;
}

/* Checkbox and radio buttons */
input[type="checkbox"],
input[type="radio"] {
  width: auto !important;
  margin-right: 0.5rem !important;
  accent-color: #B8860B !important;
}

/* Required field asterisk */
.elFormItemRequired,
.required {
  color: #B8860B !important;
}

/* Spacing between form fields */
.elFormItem,
.form-field {
  margin-bottom: 1.5rem !important;
}

/* Placeholder text */
::placeholder {
  color: #6B7280 !important;
  opacity: 0.7 !important;
}
```

---

## Step-by-Step Instructions

### 1. Log into Go High Level
- Go to https://app.gohighlevel.com
- Navigate to **Sites** → **Forms**

### 2. Create New Form
- Click **Create Form**
- Choose **Custom Form** or **Blank Template**
- Name it: "Kings Ironworks Contact Form"

### 3. Add Form Fields
Add these fields (matching your website):
- **Name** (Text field, required)
- **Email** (Email field, required)
- **Phone** (Phone field, required)
- **Service Needed** (Dropdown):
  - Fire Escape Installation
  - Fire Escape Inspection
  - Fire Escape Repair
  - Structural Steel Fabrication
  - Historic Building Restoration
  - Custom Ironwork
  - Other
- **Project Details** (Textarea, required)
- **Preferred Location** (Dropdown):
  - Everett, MA
  - Worcester, MA
  - Cape Cod, MA
  - Miami, FL

### 4. Apply Custom CSS
- In the form editor, find **Settings** or **Custom CSS** section
- Paste the entire CSS code from above
- Click **Save**

### 5. Configure Form Settings
- **Form Title**: "Get Your Free Assessment"
- **Description**: "Licensed fire escape specialists serving Boston for 20+ years. Military discount available."
- **Submit Button Text**: "Request Free Quote"
- **Success Message**: "Thank you! We'll contact you within 24 hours."

### 6. Embed on Website
After creating the form, Go High Level will provide an embed code:
```html
<iframe src="YOUR_GHL_FORM_URL" width="100%" height="800px" frameborder="0"></iframe>
```

---

## Color Reference

Use these exact colors in Go High Level:

| Element | Color Name | Hex Code | Usage |
|---------|------------|----------|-------|
| Primary (Amber) | Warm Amber | `#B8860B` | Buttons, accents |
| Background | Warm Cream | `#F9F7F4` | Form background |
| Text | Deep Charcoal | `#1E1E1E` | Headings, labels |
| Borders | Charcoal | `#1E1E1E` | All borders |
| Input BG | Pure White | `#FFFFFF` | Input fields |
| Error | Red | `#DC2626` | Error messages |
| Success | Green | `#10B981` | Success messages |

---

## Typography

- **Headings**: Space Grotesk, 900 weight
- **Body/Inputs**: Inter, 400-600 weight
- **Buttons**: Space Grotesk, 700 weight, UPPERCASE

---

## Need Help?

If you encounter any issues:
1. Make sure you're in the **Custom CSS** section, not inline styles
2. Clear your browser cache after applying CSS
3. Test the form in preview mode before publishing
4. Ensure fonts are loading (check browser console)

The form will now match your website's Industrial Heritage Brutalism design!
