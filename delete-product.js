// --- Firebase Modular SDK Imports ---
import { deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * Deletes a product from Firestore after user confirmation.
 */
export async function deleteProduct(productId, db, auth, showAlert, showConfirm, loadMyProducts, loadProducts) {
    try {
        const confirmed = await showConfirm("Are you sure you want to delete this product? This action cannot be undone.");
        if (!confirmed) return;

        // Delete the document from Firestore
        await deleteDoc(doc(db, "products", productId));
        
        // Show success message
        await showAlert("Product deleted successfully!");
        
        // Reload products in both dashboard and home sections
        if (auth.currentUser) {
            await loadMyProducts(auth.currentUser.uid);
        }
        await loadProducts();
        
    } catch (error) {
        console.error("Error deleting product:", error);
        await showAlert("Failed to delete product: " + error.message);
        
        // Re-enable the dashboard if there was an error
        if (auth.currentUser) {
            await loadMyProducts(auth.currentUser.uid);
        }
    }
}
