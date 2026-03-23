-- Fix infinite recursion in members UPDATE and DELETE policies.
-- The "Group admins can update/delete any member" policies query the members table
-- within members FOR UPDATE/DELETE policies, causing infinite recursion.
-- Replace them with a SECURITY DEFINER function that bypasses RLS.

-- Create a helper function that checks admin status without triggering RLS
CREATE OR REPLACE FUNCTION is_group_admin(check_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE user_id = auth.uid()
      AND group_id = check_group_id
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the recursive UPDATE policy
DROP POLICY IF EXISTS "Group admins can update any member in their groups" ON members;

-- Recreate it using the SECURITY DEFINER function (bypasses RLS, no recursion)
CREATE POLICY "Group admins can update any member in their groups"
  ON members FOR UPDATE
  USING (is_group_admin(group_id));

-- Drop the recursive DELETE policy
DROP POLICY IF EXISTS "Group admins can delete members from their groups" ON members;

-- Recreate it using the same SECURITY DEFINER function
CREATE POLICY "Group admins can delete members from their groups"
  ON members FOR DELETE
  USING (is_group_admin(group_id));
