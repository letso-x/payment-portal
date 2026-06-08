import { useState, useEffect, useCallback } from "react";
import { auth, db } from "./firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import DOMPurify from "dompurify";

// --- BANKING UI STYLES ---
const styles = {
  appLayout: { minHeight: "100vh", backgroundColor: "#f4f7f6", fontFamily: "'Segoe UI', Roboto, sans-serif", color: "#333", margin: "-8px" },
  navbar: { backgroundColor: "#8A1538", color: "white", padding: "15px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }, // Distinct Red/Burgundy color for Internal Staff Portal
  logo: { margin: 0, fontSize: "22px", fontWeight: "700" },
  badge: { backgroundColor: "#fff", color: "#8A1538", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", marginLeft: "10px", verticalAlign: "middle" },
  userInfo: { fontSize: "14px", color: "#f0f0f0" },
  logoutBtn: { backgroundColor: "transparent", color: "white", border: "1px solid white", padding: "6px 15px", borderRadius: "4px", cursor: "pointer", fontWeight: "600" },
  mainContainer: { padding: "40px 20px", display: "flex", justifyContent: "center" },
  card: { backgroundColor: "white", border: "1px solid #e1e4e8", padding: "35px", borderRadius: "8px", width: "360px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
  dashboard: { backgroundColor: "white", border: "1px solid #e1e4e8", padding: "30px", borderRadius: "8px", width: "100%", maxWidth: "1000px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
  cardHeader: { marginTop: 0, color: "#333", borderBottom: "2px solid #f0f2f5", paddingBottom: "15px", marginBottom: "25px", fontSize: "20px" },
  formGroup: { marginBottom: "18px", textAlign: "left" },
  label: { display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#4f566b", textTransform: "uppercase" },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #cdd4df", borderRadius: "6px", fontSize: "15px", boxSizing: "border-box", outline: "none" },
  button: { width: "100%", backgroundColor: "#0A2540", color: "white", border: "none", padding: "14px", borderRadius: "6px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginTop: "10px" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: "20px" },
  th: { textAlign: "left", padding: "12px", borderBottom: "2px solid #e1e4e8", color: "#4f566b", fontSize: "14px" },
  td: { padding: "15px 12px", borderBottom: "1px solid #e1e4e8", fontSize: "14px", verticalAlign: "middle" },
  verifyBtn: { backgroundColor: "#f0f2f5", color: "#333", border: "1px solid #cdd4df", padding: "8px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "600", fontSize: "13px", transition: "0.2s" },
  verifiedBtn: { backgroundColor: "#e3fceb", color: "#00875A", border: "1px solid #00875A", padding: "8px 12px", borderRadius: "4px", fontWeight: "600", fontSize: "13px" },
  submitBtn: { backgroundColor: "#0052FF", color: "white", border: "none", padding: "8px 16px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" },
  disabledBtn: { backgroundColor: "#cdd4df", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "4px", cursor: "not-allowed", fontWeight: "bold", fontSize: "13px" },
  errorText: { color: "#d93025", fontSize: "12px", marginTop: "5px", fontWeight: "500" }
};

const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const passwordRegex = /^(?![\s\S]*['"`;\\])^[\s\S]{8,128}$/;

function EmployeePortal() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  
  // Dashboard State
  const [transactions, setTransactions] = useState([]);
  const [verifiedList, setVerifiedList] = useState({}); // Tracks which items the employee has checked

  const sanitizeInput = (value) => DOMPurify.sanitize(value);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setTransactions([]);
  }, []);

  useEffect(() => {
    const updateActivity = () => setLastActivity(Date.now());

    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (user && Date.now() - lastActivity > 30 * 60 * 1000) {
        logout();
        alert("Session expired due to inactivity.");
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [user, lastActivity, logout]);

  // Strict Login Function - No Registration Pathway Exists
  const handleLogin = async () => {
    if (Date.now() < lockoutUntil) {
      const remainingMinutes = Math.ceil((lockoutUntil - Date.now()) / (60 * 1000));
      setPasswordError(`Account locked. Try again in ${remainingMinutes} minute(s).`);
      return;
    }

    let hasValidationError = false;
    setEmailError("");
    setPasswordError("");

    if (!emailRegex.test(email)) {
      setEmailError("Enter a valid email address.");
      hasValidationError = true;
    }

    if (!passwordRegex.test(password)) {
      setPasswordError("Incorrect email or password. Please try again. Account will be locked after 5 failed attempts");
      hasValidationError = true;
    }

    if (hasValidationError) {
      return;
    }

    if (!email || !password) {
        alert("Credentials required.");
        return;
    }
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setUser(result.user);
      setLoginAttempts(0);
      setLockoutUntil(null);
      fetchPendingTransactions();
    } catch {
      const nextAttempts = loginAttempts + 1;

      if (nextAttempts >= 5) {
        setLockoutUntil(Date.now() + 15 * 60 * 1000);
        setLoginAttempts(0);
        setPasswordError("Account locked. Try again in 15 minute(s).");
      } else {
        setLoginAttempts(nextAttempts);
      }

      alert("Unauthorized Access. Credentials failed.");
    }
  };

  // Fetch only transactions that need employee review
  const fetchPendingTransactions = async () => {
    try {
      const q = query(collection(db, "transactions"), where("status", "==", "Pending Verification"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      alert("Database connection secured, but read failed.");
    }
  };

  // Step 1: Employee confirms Payee & SWIFT details
  const toggleVerification = (transactionId) => {
    setVerifiedList(prev => ({
      ...prev,
      [transactionId]: !prev[transactionId] // Toggles true/false
    }));
  };

  // Step 2: Final Submit to SWIFT
  const submitToSwift = async (transactionId) => {
    try {
      const transactionRef = doc(db, "transactions", transactionId);
      
      // Update database status
      await updateDoc(transactionRef, {
        status: "Submitted to SWIFT",
        processedBy: user.email,
        processedAt: new Date()
      });

      // Remove from local dashboard view
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      alert("Success: Transaction successfully forwarded to the SWIFT network.");
      
    } catch (error) {
      console.error("Submission error:", error);
      alert("System Error: Could not forward to SWIFT.");
    }
  };

  return (
    <div style={styles.appLayout}>
      <nav style={styles.navbar}>
        <h1 style={styles.logo}>GlobalSecure Bank <span style={styles.badge}>INTERNAL STAFF</span></h1>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <span style={styles.userInfo}>Agent: {user.email}</span>
            <button style={styles.logoutBtn} onClick={logout}>Secure Log Off</button>
          </div>
        )}
      </nav>

      <div style={styles.mainContainer}>
        {!user ? (
          /* --- SECURE EMPLOYEE LOGIN --- */
          <div style={styles.card}>
            <h2 style={styles.cardHeader}>Internal Systems Logon</h2>
            
            <div style={styles.formGroup}>
                <label style={styles.label}>Staff Email</label>
                <input style={styles.input} placeholder="agent@globalsecure.com" onChange={(e) => { setEmail(sanitizeInput(e.target.value)); setEmailError(""); }} />
                <p style={styles.errorText}>{emailError}</p>
            </div>

            <div style={styles.formGroup}>
                <label style={styles.label}>System Password</label>
                <input style={styles.input} type="password" placeholder="••••••••" onChange={(e) => { setPassword(sanitizeInput(e.target.value)); setPasswordError(""); }} />
                <p style={styles.errorText}>{passwordError}</p>
            </div>
            
            <button style={styles.button} onClick={handleLogin}>Authenticate</button>
            <p style={{fontSize: "12px", color: "#666", marginTop: "15px", textAlign: "center"}}>
                Unauthorized access to this terminal is strictly prohibited and monitored.
            </p>
          </div>
        ) : (
          /* --- EMPLOYEE VERIFICATION DASHBOARD --- */
          <div style={styles.dashboard}>
            <h2 style={styles.cardHeader}>Pending SWIFT Transactions Overview</h2>
            
            {transactions.length === 0 ? (
                <p style={{ color: "#4f566b" }}>No pending transactions require verification at this time.</p>
            ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Customer Email</th>
                      <th style={styles.th}>Amount</th>
                      <th style={styles.th}>Payee Account Info</th>
                      <th style={styles.th}>SWIFT Code</th>
                      <th style={styles.th}>Audit Action</th>
                      <th style={styles.th}>Execution Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => {
                      const isVerified = verifiedList[t.id];

                      return (
                        <tr key={t.id}>
                          <td style={styles.td}><strong>{t.email}</strong></td>
                          <td style={styles.td}>{t.targetCurrency} {t.finalConvertedAmount || t.baseAmountZAR}</td>
                          <td style={{...styles.td, color: "#0A2540", fontWeight: "bold"}}>{t.payeeAccount}</td>
                          <td style={{...styles.td, color: "#0A2540", fontWeight: "bold", letterSpacing: "1px"}}>{t.swift}</td>
                          
                          {/* Step 1: Verification Action */}
                          <td style={styles.td}>
                            <button 
                                style={isVerified ? styles.verifiedBtn : styles.verifyBtn}
                                onClick={() => toggleVerification(t.id)}
                            >
                                {isVerified ? "✓ Verified Data" : "Mark as Verified"}
                            </button>
                          </td>
                          
                          {/* Step 2: Submission Action (Disabled until Step 1 is done) */}
                          <td style={styles.td}>
                            <button 
                                style={isVerified ? styles.submitBtn : styles.disabledBtn}
                                onClick={() => submitToSwift(t.id)}
                                disabled={!isVerified}
                            >
                                Submit to SWIFT
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeePortal;
