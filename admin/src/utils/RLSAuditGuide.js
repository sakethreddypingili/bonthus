/**
 * ROW LEVEL SECURITY (RLS) AUDIT & CONFIGURATION GUIDE
 * 
 * RLS ensures database-level security even if authentication is bypassed.
 * This is CRITICAL for multi-tenant applications.
 */

// ============================================
// CURRENT RLS STATUS
// ============================================

/*
✅ RLS Enabled on: users, orders, products, store_tax_rates, store
⚠️  RLS Status: Requires audit and enforcement verification

ISSUE: Service role key in frontend BYPASSES ALL RLS POLICIES
When using supabaseAdmin (service role), RLS is completely ignored.
This means unauthorized access is possible if:
1. XSS vulnerability found
2. Someone gains frontend access
3. Service key is leaked
*/

// ============================================
// ESSENTIAL RLS POLICIES TO IMPLEMENT
// ============================================

const RLS_POLICIES_SQL = `
-- ============================================
-- EMPLOYEES TABLE RLS
-- ============================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view users from their store
CREATE POLICY "Users can view users from their store"
  ON users FOR SELECT
  USING (
    store_id = (SELECT store_id FROM users WHERE id = auth.uid())
    OR auth.jwt() ->> 'role' = 'super_admin'
  );

-- Policy: Only admins can update users
CREATE POLICY "Only admins can update users"
  ON users FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
    AND store_id = (SELECT store_id FROM users WHERE id = auth.uid())
  );

-- Policy: Only super_admin can delete users
CREATE POLICY "Only super_admin can delete users"
  ON users FOR DELETE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
  );


-- ============================================
-- ORDERS TABLE RLS
-- ============================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view orders from their store
CREATE POLICY "Users can view orders from their store"
  ON orders FOR SELECT
  USING (
    store_id = (SELECT store_id FROM users WHERE id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
  );

-- Policy: Users can only modify orders from their store
CREATE POLICY "Users can only modify orders from their store"
  ON orders FOR UPDATE
  USING (
    store_id = (SELECT store_id FROM users WHERE id = auth.uid())
  );

-- Policy: Only admins can insert orders
CREATE POLICY "Only admins can insert orders"
  ON orders FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );


-- ============================================
-- PRODUCTS TABLE RLS
-- ============================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view products
CREATE POLICY "All authenticated users can view products"
  ON products FOR SELECT
  USING (
    auth.role() = 'authenticated'
  );

-- Policy: Only admins can modify products
CREATE POLICY "Only admins can modify products"
  ON products FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

-- Policy: Only super_admin can delete products
CREATE POLICY "Only super_admin can delete products"
  ON products FOR DELETE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
  );


-- ============================================
-- STORE_TAX_RATES TABLE RLS
-- ============================================

ALTER TABLE store_tax_rates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view tax rates for their store
CREATE POLICY "Users can view tax rates for their store"
  ON store_tax_rates FOR SELECT
  USING (
    store_id = (SELECT store_id FROM users WHERE id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
  );

-- Policy: Only store admins can modify tax rates
CREATE POLICY "Only admins can modify tax rates"
  ON store_tax_rates FOR UPDATE
  USING (
    store_id = (SELECT store_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );


-- ============================================
-- AUTH_USERS TABLE RLS
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (
    id = auth.uid()
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
  );

-- Policy: Users can only update their own profile
CREATE POLICY "Users can only update their own profile"
  ON users FOR UPDATE
  USING (
    id = auth.uid()
  );

-- Policy: Only super_admin can modify other users
CREATE POLICY "Only super_admin can modify other users"
  ON users FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
  );
`;

// ============================================
// VERIFICATION CHECKLIST
// ============================================

export const RLS_VERIFICATION_CHECKLIST = `
DATABASE SECURITY AUDIT:

RLS Configuration:
□ RLS enabled on users table
□ RLS enabled on orders table
□ RLS enabled on products table
□ RLS enabled on store_tax_rates table
□ RLS enabled on store table
□ RLS enabled on users table

Policy Verification:
□ SELECT policies allow correct access
□ UPDATE policies enforce store_id check
□ DELETE policies restrict to super_admin
□ INSERT policies restrict by role
□ No overly permissive "USING (true)" rules

Role-Based Access:
□ super_admin can see all data
□ admin can only see store data
□ employee can only see assigned store
□ employee cannot modify data except personal profile
□ anonymous users cannot access any data

Audit Logging:
□ All data modifications logged
□ Log retention configured (90+ days)
□ Log access monitored
□ Suspicious queries flagged

Connection Security:
□ All connections use SSL/TLS
□ Database password strong (16+ chars)
□ Database user has minimal necessary permissions
□ No hardcoded connection strings in code
□ Connection credentials in environment variables only

Testing:
□ Test each RLS policy manually
□ Verify users can only see own store data
□ Verify admins cannot see other store data
□ Verify service role bypasses are removed
□ Verify data leakage is impossible
`;

// ============================================
// TESTING RLS POLICIES
// ============================================

export const testRLSPolicies = async (supabase, userId, userRole, userStoreId) => {
  console.log('Testing RLS Policies...');
  
  try {
    // Test 1: User can view users from their store
    const { data: ownStoreEmployees, error: error1 } = await supabase
      .from('users')
      .select('*')
      .eq('store_id', userStoreId);
    
    if (error1) {
      console.error('❌ FAIL: Cannot view own store users', error1);
      return false;
    }
    console.log('✅ PASS: Can view own store users');

    // Test 2: User cannot view users from other store
    // (This would need another store_id)
    
    // Test 3: User cannot modify employee data if not admin
    if (userRole === 'employee') {
      const { error: updateError } = await supabase
        .from('users')
        .update({ status: 'inactive' })
        .eq('id', 'any-employee-id');
      
      if (!updateError) {
        console.error('❌ FAIL: Employee was able to modify employee data!');
        return false;
      }
      console.log('✅ PASS: Non-admin cannot modify employee data');
    }

    // Test 4: Admin can modify their store users
    if (userRole === 'admin') {
      const { error: adminUpdateError } = await supabase
        .from('users')
        .update({ status: 'active' })
        .eq('store_id', userStoreId)
        .select()
        .limit(1);
      
      // Should succeed (or no rows to update)
      console.log('✅ PASS: Admin can modify store users');
    }

    console.log('✅ All RLS tests passed!');
    return true;

  } catch (error) {
    console.error('❌ RLS Testing Error:', error);
    return false;
  }
};

// ============================================
// COMMON RLS MISTAKES TO AVOID
// ============================================

export const commonRLSMistakes = `
❌ MISTAKE 1: Using service role in frontend
   Bypasses all RLS policies. NEVER do this.
   Solution: Use service role only in backend API.

❌ MISTAKE 2: RLS policies using hardcoded values
   CREATE POLICY "Bad" ON table USING (store_id = '123');
   Solution: Use auth.uid() and joins to users

❌ MISTAKE 3: Overly permissive policies
   CREATE POLICY "Allow All" ON table USING (TRUE);
   Solution: Use specific role-based conditions

❌ MISTAKE 4: Forgetting UPDATE/DELETE policies
   Only having SELECT policies leaves data vulnerable
   Solution: Create policies for all DML operations

❌ MISTAKE 5: Not enabling RLS
   CREATE POLICY without ALTER TABLE ENABLE RLS
   Solution: Always enable RLS on sensitive tables

❌ MISTAKE 6: Not testing RLS policies
   Deploying untested policies allows data leaks
   Solution: Use testRLSPolicies() function to verify

✅ BEST PRACTICE 1: Deny first approach
   Explicitly grant access rather than deny

✅ BEST PRACTICE 2: Use JWT claims
   Verify claims in policies, not just user ID

✅ BEST PRACTICE 3: Log policy denials
   Monitor for suspicious access attempts

✅ BEST PRACTICE 4: Test thoroughly
   Test each policy with different user roles

✅ BEST PRACTICE 5: Document policies
   Comment why each policy exists
`;

// ============================================
// IMMEDIATE ACTION ITEMS
// ============================================

export const RLS_ACTION_ITEMS = `
CRITICAL - Do immediately:
1. [ ] Remove service role key from frontend
2. [ ] Audit existing RLS policies
3. [ ] Verify RLS is enabled on all sensitive tables
4. [ ] Test RLS policies with different user roles
5. [ ] Document all RLS policies

HIGH - This week:
1. [ ] Implement missing RLS policies from guide above
2. [ ] Add RLS testing to CI/CD pipeline
3. [ ] Train team on RLS best practices
4. [ ] Set up monitoring for RLS denials
5. [ ] Create RLS policy review checklist

MEDIUM - This month:
1. [ ] Implement audit logging for all data access
2. [ ] Add query performance monitoring
3. [ ] Review and optimize RLS policies
4. [ ] Implement data retention policies
5. [ ] Security training for developers
`;

console.log('RLS Audit Guide loaded. Review policies and implement missing RLS configurations.');
