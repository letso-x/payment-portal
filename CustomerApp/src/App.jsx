import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { addDoc, collection } from "firebase/firestore";
import DOMPurify from "dompurify";

// --- BANKING UI STYLES ---
const styles = {
  appLayout: { minHeight: "100vh", backgroundColor: "#f4f7f6", fontFamily: "'Segoe UI', Roboto, sans-serif", color: "#333", margin: "-8px" },
  navbar: { backgroundColor: "#0A2540", color: "white", padding: "15px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" },
  logo: { margin: 0, fontSize: "22px", fontWeight: "700" },
  userInfo: { fontSize: "14px", color: "#e0e6ed" },
  logoutBtn: { backgroundColor: "transparent", color: "white", border: "1px solid white", padding: "6px 15px", borderRadius: "4px", cursor: "pointer", fontWeight: "600" },
  mainContainer: { padding: "50px 20px", display: "flex", justifyContent: "center" },
  grid: { display: "flex", justifyContent: "center", gap: "30px", flexWrap: "wrap", maxWidth: "900px", width: "100%" },
  card: { backgroundColor: "white", border: "1px solid #e1e4e8", padding: "35px", borderRadius: "8px", width: "360px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
  cardHeader: { marginTop: 0, color: "#0A2540", borderBottom: "2px solid #f0f2f5", paddingBottom: "15px", marginBottom: "25px", fontSize: "20px" },
  formGroup: { marginBottom: "18px", textAlign: "left" },
  label: { display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#4f566b", textTransform: "uppercase" },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #cdd4df", borderRadius: "6px", fontSize: "15px", boxSizing: "border-box", outline: "none", backgroundColor: "#fff" , color: "#333"},
  button: { width: "100%", backgroundColor: "#0052FF", color: "white", border: "none", padding: "14px", borderRadius: "6px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginTop: "10px" },
  errorText: { color: "#d93025", fontSize: "12px", marginTop: "5px", fontWeight: "500" },
  row: { display: "flex", gap: "10px" },
  conversionBox: { marginTop: "10px", padding: "12px", backgroundColor: "#eef2f6", borderRadius: "6px", fontSize: "14px", color: "#0A2540", fontWeight: "600", borderLeft: "4px solid #0052FF" }
};

// --- REGEX PATTERNS (Moved outside component for better performance) ---
const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  fullName: /^[a-zA-Z\s]{2,50}$/,
  idNumber: /^\d{13}$/, 
  amount: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
  account: /^\d{10,18}$/, 
  swift: /^[A-Z0-9]{8,11}$/
};

const sanitizeInput = (value) => DOMPurify.sanitize(value);

// --- MAIN COMPONENT ---
function App() {
  const [user, setUser] = useState(null);
  const [errors, setErrors] = useState({});
  
  // Registration State
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [regAccount, setRegAccount] = useState("");
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState("");
  
  // Login State
  const [loginAccount, setLoginAccount] = useState("");

  // Payment State
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD"); // Defaulted to USD for conversion demo
  const [provider, setProvider] = useState("SWIFT");
  const [payeeAccount, setPayeeAccount] = useState("");
  const [swift, setSwift] = useState("");

  // API Conversion State
  const [convertedAmount, setConvertedAmount] = useState(null);
  const [isConverting, setIsConverting] = useState(false);

  // --- CURRENCY API LOGIC ---
  useEffect(() => {
    const fetchConversion = async () => {
      // Don't call API if amount is empty or fails RegEx security check
      if (!amount || !patterns.amount.test(amount)) {
        setConvertedAmount(null);
        return;
      }
      
      setIsConverting(true);
      try {
        // Secure HTTPS call to open-source API
        const response = await fetch(`https://api.frankfurter.dev/v1/latest?amount=${amount}&from=ZAR&to=${currency}`);
        if (!response.ok) throw new Error("API Network Error");
        const data = await response.json();
        
        // Format to 2 decimal places
        setConvertedAmount(data.rates[currency].toFixed(2));
      } catch (error) {
        console.error("Currency API Error:", error);
        setConvertedAmount("Error fetching live rate");
      } finally {
        setIsConverting(false);
      }
    };

    // Debouncing: Waits 500ms after user stops typing before calling API to prevent spamming
    const timeoutId = setTimeout(() => {
      fetchConversion();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [amount, currency]); // Runs whenever amount or currency changes


  const handleBlur = (e) => {
    const { name, value } = e.target;
    let errorMessage = "";

    if (value.trim() !== "") { 
      switch (name) {
        case "fullName": if (!patterns.fullName.test(value)) errorMessage = "Only letters & spaces (2-50 chars)."; break;
        case "idNumber": if (!patterns.idNumber.test(value)) errorMessage = "Must be exactly 13 digits."; break;
        case "email": if (!patterns.email.test(value)) errorMessage = "Invalid username/email format."; break;
        case "password": if (!patterns.password.test(value)) errorMessage = "Needs 8+ chars, 1 uppercase, 1 number, 1 special char."; break;
        case "regAccount": 
        case "loginAccount":
        case "payeeAccount": 
            if (!patterns.account.test(value)) errorMessage = "Account must be 10-18 digits."; break;
        case "amount": if (!patterns.amount.test(value)) errorMessage = "Invalid amount (e.g., 100.50)."; break;
        case "swift": if (!patterns.swift.test(value)) errorMessage = "Must be 8 or 11 alphanumeric characters."; break;
        default: break;
      }
    }
    setErrors(prevErrors => ({ ...prevErrors, [name]: errorMessage }));
  };

  const register = async () => {
    if (!patterns.email.test(email) || !patterns.password.test(password) || !patterns.fullName.test(fullName) || !patterns.idNumber.test(idNumber) || !patterns.account.test(regAccount)) {
      alert("Registration failed: Please fix the errors in red before submitting.");
      return;
    }
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await addDoc(collection(db, "users"), {
        uid: result.user.uid, 
        fullName, 
        idNumber, 
        accountNumber: regAccount,
        registrationDate: new Date()
      });
      setUser(result.user); 
    } catch (err) { alert(err.message); }
  };

  const login = async () => {
    if (!patterns.email.test(email) || !patterns.account.test(loginAccount)) { 
        alert("Invalid login details format. Please check Username and Account Number."); 
        return; 
    }
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setUser(result.user); 
    } catch (err) { alert("Login failed. Check credentials."); }
  };

  const makePayment = async () => {
    if (!patterns.amount.test(amount) || !patterns.account.test(payeeAccount) || !patterns.swift.test(swift)) {
        alert("Payment blocked: Please check the red inline errors."); return;
    }
    if (!user) { alert("Authentication required."); return; }
    try {
      // Storing BOTH the ZAR amount and the converted API amount
      await addDoc(collection(db, "transactions"), { 
        uid: user.uid, 
        email: user.email, 
        baseAmountZAR: amount, 
        targetCurrency: currency,
        finalConvertedAmount: convertedAmount,
        provider: provider,
        payeeAccount: payeeAccount, 
        swift: swift, 
        status: "Pending Verification", 
        timestamp: new Date()
      });
      alert(`Success! ${convertedAmount} ${currency} submitted to SWIFT for processing.`);
    } catch (err) { alert(err.message); }
  };

  const logout = () => setUser(null);

  return (
    <div style={styles.appLayout}>
      <nav style={styles.navbar}>
        <h1 style={styles.logo}>GlobalSecure Bank</h1>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <span style={styles.userInfo}>{user.email}</span>
            <button style={styles.logoutBtn} onClick={logout}>Sign Out</button>
          </div>
        )}
      </nav>

      <div style={styles.mainContainer}>
        {!user ? (
          <div style={styles.grid}>
            {/* --- REGISTER CARD --- */}
            <div style={styles.card}>
              <h2 style={styles.cardHeader}>Pre-register Account</h2>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Full Name</label>
                <input name="fullName" style={styles.input} placeholder="John Doe" onChange={(e) => setFullName(sanitizeInput(e.target.value))} onBlur={handleBlur} />
                {errors.fullName && <div style={styles.errorText}>{errors.fullName}</div>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>ID Number</label>
                <input name="idNumber" style={styles.input} placeholder="13 Digit ID" onChange={(e) => setIdNumber(sanitizeInput(e.target.value))} onBlur={handleBlur} />
                {errors.idNumber && <div style={styles.errorText}>{errors.idNumber}</div>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Your Account Number</label>
                <input name="regAccount" style={styles.input} placeholder="10-18 Digits" onChange={(e) => setRegAccount(sanitizeInput(e.target.value))} onBlur={handleBlur} />
                {errors.regAccount && <div style={styles.errorText}>{errors.regAccount}</div>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Username (Email)</label>
                <input name="email" style={styles.input} placeholder="name@example.com" onChange={(e) => setEmail(sanitizeInput(e.target.value))} onBlur={handleBlur} />
                {errors.email && <div style={styles.errorText}>{errors.email}</div>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Password</label>
                <input name="password" style={styles.input} type="password" placeholder="••••••••" onChange={(e) => setPassword(sanitizeInput(e.target.value))} onBlur={handleBlur} />
                {errors.password && <div style={styles.errorText}>{errors.password}</div>}
              </div>

              <button style={styles.button} onClick={register}>Register</button>
            </div>
            
            {/* --- LOGIN CARD --- */}
            <div style={{...styles.card, height: "fit-content"}}>
               <h2 style={styles.cardHeader}>Customer Logon</h2>
               
               <div style={styles.formGroup}>
                 <label style={styles.label}>Username (Email)</label>
                 <input name="email" style={styles.input} placeholder="Username" onChange={(e) => setEmail(sanitizeInput(e.target.value))} onBlur={handleBlur} />
                 {errors.email && <div style={styles.errorText}>{errors.email}</div>}
               </div>

               <div style={styles.formGroup}>
                 <label style={styles.label}>Account Number</label>
                 <input name="loginAccount" style={styles.input} placeholder="Your Account Number" onChange={(e) => setLoginAccount(sanitizeInput(e.target.value))} onBlur={handleBlur} />
                 {errors.loginAccount && <div style={styles.errorText}>{errors.loginAccount}</div>}
               </div>

               <div style={styles.formGroup}>
                 <label style={styles.label}>Password</label>
                 <input name="password" style={styles.input} type="password" placeholder="••••••••" onChange={(e) => setPassword(sanitizeInput(e.target.value))} />
               </div>
               
               <button style={styles.button} onClick={login}>Log On</button>
            </div>
          </div>
        ) : (
          <div style={styles.grid}>
            {/* --- PAYMENT CARD --- */}
            <div style={{...styles.card, width: "450px"}}>
              <h2 style={styles.cardHeader}>International Payment System</h2>
              
              <div style={styles.row}>
                  <div style={{...styles.formGroup, flex: 2}}>
                    <label style={styles.label}>Transfer Amount (ZAR)</label>
                    <input name="amount" style={styles.input} placeholder="0.00" onChange={(e) => setAmount(sanitizeInput(e.target.value))} onBlur={handleBlur} />
                    {errors.amount && <div style={styles.errorText}>{errors.amount}</div>}
                  </div>
                  <div style={{...styles.formGroup, flex: 1}}>
                    <label style={styles.label}>To Currency</label>
                    <select style={styles.input} value={currency} onChange={(e) => setCurrency(sanitizeInput(e.target.value))}>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="AUD">AUD</option>
                        <option value="JPY">JPY</option>
                    </select>
                  </div>
              </div>

              {/* DYNAMIC API CONVERSION DISPLAY */}
              {convertedAmount && !errors.amount && (
                <div style={styles.conversionBox}>
                  {isConverting ? "Fetching live rate..." : `Total Payee Receives: ${convertedAmount} ${currency}`}
                </div>
              )}
              <br/>

              <div style={styles.formGroup}>
                <label style={styles.label}>Provider</label>
                <select style={styles.input} value={provider} onChange={(e) => setProvider(sanitizeInput(e.target.value))}>
                    <option value="SWIFT">SWIFT Network</option>
                    <option value="SEPA">SEPA (Europe)</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Payee Account Information</label>
                <input name="payeeAccount" style={styles.input} placeholder="Account Number or IBAN" onChange={(e) => setPayeeAccount(sanitizeInput(e.target.value))} onBlur={handleBlur} autoComplete="off"/>
                {errors.payeeAccount && <div style={styles.errorText}>{errors.payeeAccount}</div>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>SWIFT Code</label>
                <input name="swift" style={styles.input} placeholder="8 or 11 characters" onChange={(e) => setSwift(sanitizeInput(e.target.value))} onBlur={handleBlur}  />
                {errors.swift && <div style={styles.errorText}>{errors.swift}</div>}
              </div>

              <button style={{...styles.button, backgroundColor: "#00875A"}} onClick={makePayment}>Pay Now</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;