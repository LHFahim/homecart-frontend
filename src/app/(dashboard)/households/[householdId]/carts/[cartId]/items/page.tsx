import { CartItemsPanel } from "@/components/cart-items-panel";
import { getCartItems, type CartItem } from "@/lib/cart-items-api";
import { getCartById } from "@/lib/carts-api";
import { getHouseholdById } from "@/lib/households-api";

interface CartItemsPageProps {
  params: Promise<{
    householdId: string;
    cartId: string;
  }>;
}

export default async function CartItemsPage({ params }: CartItemsPageProps) {
  const { householdId, cartId } = await params;

  let householdName = householdId;
  let cartName = cartId;
  let initialError: string | null = null;
  let initialItems: CartItem[] = [];

  try {
    const cart = await getCartById(cartId);
    cartName = cart.name || cartId;

    initialItems = await getCartItems(cartId);

    try {
      const household = await getHouseholdById(householdId);
      householdName = household.name || householdId;
    } catch {
      householdName = householdId;
    }
  } catch (error: unknown) {
    initialError =
      error instanceof Error ? error.message : "Unable to load cart items.";
  }

  return (
    <CartItemsPanel
      cartId={cartId}
      householdName={householdName}
      cartName={cartName}
      initialItems={initialItems}
      initialError={initialError}
    />
  );
}
