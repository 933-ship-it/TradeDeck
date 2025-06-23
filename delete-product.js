// --- Firebase Modular SDK Imports ---
import { deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * Deletes a product from Firestore after user confirmation.
 * Reloads the user's products in the dashboard and all products in the home section upon successful deletion.
 *
 * @param {string} productId The ID of the product to delete.
 * @param {object} db The Firestore database instance.
 * @param {object} auth The Firebase Auth instance.
 * @param {function} showAlert Function to display custom alert messages.
 * @param {function} showConfirm Function to display custom confirmation messages.
 * @param {function} loadMyProducts Function to reload products in the user's dashboard.
 * @param {function} loadProducts Function to reload all products in the home section.
 */
export async function deleteProduct(productId, db, auth, showAlert, showConfirm, loadMyProducts, loadProducts) {
  const confirmed = await showConfirm("Are you sure you want to delete this product? This action cannot be undone.");
  if (confirmed) {
    try {
      // Delete the document from the 'products' collection in Firestore
      await deleteDoc(doc(db, "products", productId));

      // Show success message to the user
      await showAlert("Product deleted successfully!");

      // If a user is authenticated, reload their products in the dashboard
      if (auth.currentUser) {
        await loadMyProducts(auth.currentUser.uid);
      }
      // Reload all products in the home section to reflect the deletion
      await loadProducts();
    } catch (error) {
      // Log and display error if deletion fails
      console.error("Error deleting product:", error);
      await showAlert("Failed to delete product: " + error.message);
    }
  }
}
