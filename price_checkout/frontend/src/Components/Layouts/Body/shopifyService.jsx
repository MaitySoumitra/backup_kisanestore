// frontend/src/shopifyService.js
import axios from 'axios';

// Create Checkout function
export async function createCheckout(lineItems) {
  const mutation = `
    mutation checkoutCreate($input: CheckoutCreateInput!) {
      checkoutCreate(input: $input) {
        checkout {
          id
          webUrl
        }
        checkoutUserErrors {
          code
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      lineItems: lineItems,
      customAttributes: [],
      allowPartialAddresses: true,
    }
  };

  try {
    const response = await axios.post(
      'https://kisanestoredev.myshopify.com/api/2023-01/graphql.json',
      { query: mutation, variables },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': 'YOUR_ACCESS_TOKEN',
        }
      }
    );

    return response.data?.data?.checkoutCreate?.checkout;
  } catch (error) {
    console.error('Error creating checkout:', error);
    return null;
  }
}

// Add Item to Cart function
export async function addItemToCart(checkoutId, variantId, quantity) {
  const mutation = `
    mutation checkoutLineItemsAdd($checkoutId: ID!, $lineItems: [CheckoutLineItemInput!]!) {
      checkoutLineItemsAdd(checkoutId: $checkoutId, lineItems: $lineItems) {
        checkout {
          id
          lineItems(first: 10) {
            edges {
              node {
                id
                title
                quantity
                variant {
                  id
                  title
                }
              }
            }
          }
        }
        checkoutUserErrors {
          code
          field
          message
        }
      }
    }
  `;

  const variables = {
    checkoutId: checkoutId,
    lineItems: [{
      variantId: variantId,
      quantity: quantity,
    }],
  };

  try {
    const response = await axios.post(
      'https://kisanestoredev.myshopify.com/api/2023-01/graphql.json',
      { query: mutation, variables },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': 'YOUR_ACCESS_TOKEN',
        }
      }
    );

    return response.data?.data?.checkoutLineItemsAdd?.checkout;
  } catch (error) {
    console.error('Error adding item to cart:', error);
    return null;
  }
}
