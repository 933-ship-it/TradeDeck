import {
  auth, db,
  onAuthStateChanged, signOut, deleteUser,
  collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp,
  formatPrice, showToast, sendEmailNotification
} from './helpers.js';

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    document.getElementById('authOverlay').classList.remove('hidden');
    return;
  }

  // Show profile pic
  const photo = user.photoURL;
  if (photo) {
    const picEl = document.getElementById("userProfilePic");
    picEl.src = photo;
    picEl.classList.remove("hidden");
  }

  // Setup dashboard...
  showToast("Signed in as " + user.email, "success");
});

// Sign Out
document.getElementById("signOutBtn").addEventListener("click", () => {
  signOut(auth).then(() => {
    showToast("Signed out", "info");
    window.location.href = "/sign-in.html";
  });
});

// Delete Account
document.getElementById("deleteAccountBtn").addEventListener("click", async () => {
  try {
    await deleteUser(auth.currentUser);
    showToast("Account deleted", "success");
    window.location.href = "/sign-in.html";
  } catch (err) {
    showToast("Failed to delete account", "error");
  }
});

// More logic here to handle product loading, uploading, search, etc.
