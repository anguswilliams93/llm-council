# User Profile Dialog - Multi-Select Council Models Setup

## Overview
The user profile dialog has been updated to use a **multi-select dropdown with search functionality** for selecting up to 4 council board member models, instead of 4 separate dropdown boxes.

## Features
✅ **Single Popover Multi-Select**: One dropdown for all council models (up to 4)  
✅ **Real-time Search**: Filter models by name and description  
✅ **Visual Selection Tags**: Selected models display as removable tags below the dropdown  
✅ **Chairman Model**: Single required selection for the chairman model  
✅ **Model Limit**: Enforces maximum of 4 council models with user feedback  
✅ **Validation**: Requires at least 1 chairman model and 1 council model  

## Required Installations

Before using the updated profile dialog, you need to install two new shadcn/ui components:

### Command and Popover Components
Run the following command in your project root:

```bash
npx shadcn@latest add @shadcn/command @shadcn/popover
```

This will install:
- **Command Component**: Provides searchable, keyboard-accessible list functionality
- **Popover Component**: Floating content container that attaches to triggers

## File Changes

### `components/user-profile-dialog.tsx`
**Updated:**
- Replaced 4 separate council model dropdowns with single multi-select combobox
- Added search/filter functionality for models
- Added visual tags for selected models
- Integrated Command and Popover components
- Added `cn` utility import for className merging

**New State:**
- `councilOpen`: Controls popover visibility
- `searchQuery`: Stores search input for filtering models

**New Functions:**
- `getCouncilModelsDisplay()`: Returns display text for selected models count
- `toggleCouncilModel()`: Adds/removes models from selection (max 4)
- `filteredModels`: Computed models list based on search query

### `lib/userProfile.ts`
No changes - already supports the new profile structure with `chairmanModel` and `councilModels[]`

## User Interface

### Chairman Model Selection
- Single dropdown with search
- Required field
- Displays selected model name and description

### Council Models Multi-Select
- **Dropdown Button**: Shows "X models selected" or "Select models..."
- **Search Input**: Filter models by name or description in real-time
- **Model Items**: Each model shows name, description, and checkmark when selected
- **Selected Tags**: Below dropdown, shows selected models as removable chips
- **Enforcement**: Maximum 4 models allowed per user

### Status Display
- Shows count of available models from OpenRouter
- Shows chairman selection status (✓/✗)
- Shows count of selected council models (X/4)

## Validation

The component validates:
1. Username is provided
2. Email is provided
3. Chairman model is selected
4. At least 1 council model is selected
5. Maximum 4 council models are not exceeded

## Usage Example

```typescript
import { UserProfileDialog } from "@/components/user-profile-dialog";

// In your component
<UserProfileDialog 
  onSave={(profile) => {
    console.log("Chairman:", profile.chairmanModel);
    console.log("Council:", profile.councilModels);
  }}
/>
```

The profile is automatically saved to localStorage and can be retrieved with:

```typescript
import { getUserProfile } from "@/lib/userProfile";

const profile = getUserProfile();
// profile.chairmanModel: "openai/gpt-4o"
// profile.councilModels: ["google/gemini-pro", "anthropic/claude-sonnet"]
```

## Next Steps

1. Install the required components:
   ```bash
   npx shadcn@latest add @shadcn/command @shadcn/popover
   ```

2. Test the profile dialog functionality:
   - Open the profile dialog via the avatar button
   - Search for models using the search box
   - Select a chairman model
   - Select 1-4 council models
   - Verify tags appear below the dropdown
   - Test removal of selected models
   - Save and verify localStorage
