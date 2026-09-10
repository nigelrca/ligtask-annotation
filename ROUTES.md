# Application Routes

## Public Routes

### `/` - Home/Landing Page
- Welcome screen with login button
- Information about the platform

### `/login` - Authentication
- Email/password login form
- Currently placeholder (needs Supabase integration)
- Redirects to appropriate page based on user role

## Translator Routes

### `/translate` - Translation Mode Dashboard
- List view of all prompts
- Progress tracker (completed/total/remaining)
- Navigation between prompts
- Shows context summary for each prompt
- "Evaluate Translation" button for each prompt

### `/translate/[promptId]` - Translation Evaluation
- Full context display
- English and Filipino text side-by-side
- Yes/No buttons for translation correctness
- Text area for revised translation (if incorrect)
- Submit button
- Returns to dashboard after submission

## Annotator Routes

### `/annotate` - Annotation Mode Dashboard
- List view of all prompts
- Progress tracker
- Navigation between prompts
- Full context information display
- Task type indicator
- "Evaluate Safety" button for each prompt

### `/annotate/[promptId]` - Safety Evaluation
- Complete context details (sender, recipient, transmission principles)
- English and Filipino text display
- Task-specific classification options:
  - **NLU**: Safe / Unsafe
  - **NLR**: Violates Policy / Does not Violate Policy
  - **NLG**: Answer / Refuse
- Submit button
- Returns to dashboard after submission

## Admin Routes

### `/admin` - Admin Dashboard
- Overview cards for Users, Prompts, and Results
- Quick stats (total users, prompts, evaluations)
- Navigation to management pages

### `/admin/users` - User Management
- List of all users
- Create new user button
- Edit/deactivate user capabilities
- Role assignment
- Currently placeholder (needs implementation)

### `/admin/prompts` - Prompt Management
- Table view of all prompts
- Display: ID, English text, task type, category
- Upload prompts button
- View/edit individual prompts
- Shows dummy data currently

### `/admin/results` - Results & Analytics
- Summary statistics
- Recent evaluations list
- Export results button
- Inter-annotator agreement section
- Krippendorff's Alpha calculation (when data available)

## Route Access Control (To Be Implemented)

```
Role: ADMIN
  ✓ /admin/*
  ✓ /translate (view only)
  ✓ /annotate (view only)

Role: TRANSLATOR
  ✓ /translate/*
  ✗ /annotate
  ✗ /admin

Role: ANNOTATOR
  ✓ /annotate/*
  ✗ /translate
  ✗ /admin
```

## API Routes (To Be Implemented)

Future server actions/API routes:

```
POST /api/auth/login
POST /api/auth/logout
GET  /api/prompts
GET  /api/prompts/:id
POST /api/evaluations
PUT  /api/assignments/:id
GET  /api/admin/users
POST /api/admin/users
PUT  /api/admin/users/:id
POST /api/admin/prompts/upload
GET  /api/admin/results
GET  /api/admin/results/export
```

## Navigation Flow

### Translator User Flow
1. Login → `/login`
2. Redirect → `/translate`
3. Browse prompts with Previous/Next
4. Click "Evaluate Translation" → `/translate/[promptId]`
5. Make evaluation → Submit → Back to `/translate`
6. Repeat until queue complete

### Annotator User Flow
1. Login → `/login`
2. Redirect → `/annotate`
3. Browse prompts with Previous/Next
4. Click "Evaluate Safety" → `/annotate/[promptId]`
5. Make classification → Submit → Back to `/annotate`
6. Repeat until queue complete

### Admin User Flow
1. Login → `/login`
2. Redirect → `/admin`
3. Can access:
   - `/admin/users` - Create/manage users
   - `/admin/prompts` - Upload/manage dataset
   - `/admin/results` - View results and analytics
