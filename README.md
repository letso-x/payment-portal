# Payment Portal

## Live Link
- Customer Portal: https://payment-portal-3c5bc.web.app/
- Employee Portal: https://paymentportal-internal.web.app/
## Demo Video
Watch our demostration here:
https://youtu.be/ZomzcVdCwvo
## Tech Stack

This project is built using a modern frontend-focused architecture with cloud-based backend services.

### Frontend
- **React** – Component-based UI development  
- **Vite** – Fast build tool and development server  
- **JavaScript (ES6+)** – Core programming language  
- **HTML5 & CSS3** – Structure and styling  

### Backend & Cloud Services
- **Firebase**
  - Hosting (deployment)  
  - Authentication  
  - Firestore  

### Project Structure
- **CustomerApp/** – Customer-facing application  
- **EmployeeApp/** – Employee-facing application  

### Tooling & DevOps
- **ESLint** – Code linting and quality enforcement  
- **SonarQube** – Code quality and security analysis  
- **GitHub Actions** – CI/CD workflows  
- **npm** – Package management  

---

## Project Overview
This application is a payment portal system with separate interfaces for customers and employees. It allows users to manage and process transactions securely.  

The system includes:
- User registration and login  
- A simulated international payment form  

The main focus of the project is **security implementation and understanding**, rather than UI design.

---

## Security Features

The application was designed with security as a priority, implementing the following:

### Password Security
- Firebase Authentication is used to securely manage user credentials  
- Passwords are hashed and salted automatically by Firebase  

### Input Validation (Whitelisting)
- All user inputs are validated using strict rules (whitelisting)  
- Fields validated include:
  - Email  
  - Name  
  - Payment amount  
  - Account / IBAN  
- Invalid or malicious input is rejected before processing  

### HTTPS / Secure Communication
- The application is deployed using Firebase Hosting  
- All communication is secured over **HTTPS (SSL encryption)**  

### Protection Against Common Attacks
The system is protected against common web vulnerabilities through a combination of platform features and validation:

- **Brute Force Attacks**  
  - Mitigated by Firebase Authentication rate limiting and secure login handling  

- **Cross-Site Scripting (XSS)**  
  - Prevented through input validation and React’s built-in escaping  

- **Injection Attacks**  
  - Prevented by strict input validation and use of managed backend services  

- **Session Hijacking**  
  - Protected via secure Firebase session management  

- **Man-in-the-Middle Attacks**  
  - Prevented through enforced HTTPS encryption  

These protections reflect real-world secure development practices and align with OWASP guidelines.

---

## DevSecOps & CI/CD
- GitHub Actions is used to automate build and validation processes  
- SonarQube is integrated for:
  - Vulnerability detection  
  - Code quality checks  
  - Security hotspot identification  

This ensures continuous monitoring and improves overall application security.

---

## Setup Instructions
1. Install dependencies:
   npm install
   
3. Run the development server:
   npm run dev

---

## AI Usage
Google Gemini was used to assist with code generation and debugging. All generated code was reviewed, tested, and adapted to meet the project requirements.

---

## Team Members
- **ST10364883** – Kukhanya Dlanjwa  
- **ST10530827** – Tshireletso Seqeta  
- **ST10533342** – Akiraho Ravhura  
- **ST10530868** – Karabo Promise Khoza  
- **ST10355256** – Halalisile Mzobe  
