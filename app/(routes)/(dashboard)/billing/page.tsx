import { ClerkLoaded, ClerkLoading, PricingTable } from "@clerk/nextjs";

const BillingPage = () => {
  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto w-full h-full">
        <header className="flex items-center justify-between pt-4 pb-2">
          <div>
            <h1 className="text-xl font-semibold">Billing</h1>
          </div>
          <div className="flex items-center gap-4">
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your subscription and billing information.
            </p>
          </div>
        </header>

        <ClerkLoading>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </ClerkLoading>

        <ClerkLoaded>
          <PricingTable for="user" newSubscriptionRedirectUrl="/billing" />
        </ClerkLoaded>
      </div>
    </div>
  );
};

export default BillingPage;
