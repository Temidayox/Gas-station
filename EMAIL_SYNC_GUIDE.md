# Email Change & Google OAuth Sync Guide

## 🔄 How Email Changes Work with Google OAuth

When you update a staff member's email address, the system automatically handles the Google OAuth synchronization:

### **What Happens When You Change an Email:**

1. **Database Update** - The email is updated in the database
2. **OAuth Reset** - `googleId` and `avatarUrl` are cleared to force re-authentication
3. **User Action Required** - The user must sign out and sign back in with their new Google account

### **Authentication Flow After Email Change:**

1. **User Signs In** with new Google email
2. **Google OAuth** provides the new email
3. **System Finds User** by the new email in database
4. **Role Preserved** - User's role and permissions remain the same
5. **Auto Redirect** - Based on role:
   - **ADMIN** → `/dashboard`
   - **OUTLET_STAFF** → `/dashboard` 
   - **CUSTOMER** → `/profile`

### **Example Scenario:**

**Before:**
- Email: `fatima@oldcompany.com`
- Role: `OUTLET_STAFF`
- Outlet: `Lagos Island`

**Admin Changes Email To:**
- Email: `fatima@newcompany.com`
- Role: `OUTLET_STAFF` (unchanged)
- Outlet: `Lagos Island` (unchanged)

**What Fatima Needs To Do:**
1. Sign out of her current session
2. Sign back in with Google using `fatima@newcompany.com`
3. System automatically redirects her to `/dashboard` with full staff permissions

### **Important Notes:**

✅ **Role Preservation** - User's role and outlet assignment are preserved
✅ **Security** - Email changes require re-authentication for security
✅ **No Duplicate Accounts** - System prevents email conflicts
✅ **Automatic Redirects** - Users go to correct dashboard based on role
✅ **Session Update** - New JWT token reflects updated information

### **For Admins:**

When you change a staff member's email, inform them that they need to:
1. Sign out of their current session
2. Sign back in with their new Google account
3. They will be automatically redirected to the appropriate dashboard

### **Troubleshooting:**

If a user can't sign in after email change:
- Verify they're using the correct Google account
- Check that the new email isn't already used by another user
- Ensure they sign out completely before signing back in

The system handles all the synchronization automatically - just need the user to re-authenticate with their new Google account!
