-- Add account_id column to finance_transactions table
ALTER TABLE finance_transactions 
ADD COLUMN account_id UUID REFERENCES finance_accounts(id);

-- Add index for better performance
CREATE INDEX idx_finance_transactions_account_id ON finance_transactions(account_id);

-- Add comment
COMMENT ON COLUMN finance_transactions.account_id IS 'Reference to the finance account this transaction belongs to';
