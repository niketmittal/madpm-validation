// MADpm Landing Page Interactive Logic with Firebase Support
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async () => {
    // ----------------------------------------------------
    // Firebase & .env Dynamic Integration
    // ----------------------------------------------------
    let db = null;
    let useFirebase = false;

    // Local Storage Helpers
    const getLocalLeads = () => JSON.parse(localStorage.getItem('madpm_leads') || '[]');
    const saveLocalLead = (lead) => {
        let leads = getLocalLeads();
        leads.push(lead);
        localStorage.setItem('madpm_leads', JSON.stringify(leads));
    };

    // Parser for local .env at runtime
    const loadEnv = async () => {
        try {
            const response = await fetch('.env');
            if (!response.ok) throw new Error('Not found');
            const text = await response.text();
            const env = {};
            text.split(/\r?\n/).forEach(line => {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.startsWith('#')) return;
                const idx = trimmedLine.indexOf('=');
                if (idx > 0) {
                    const key = trimmedLine.substring(0, idx).trim();
                    const val = trimmedLine.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
                    env[key] = val;
                }
            });
            return env;
        } catch (e) {
            console.warn("Local .env fetch skipped or failed. Using localStorage backup for leads. (Hint: Serve via http server to load .env)");
            return null;
        }
    };

    // Firebase Initializer
    const initFirebase = async () => {
        const env = await loadEnv();

        const firebaseConfig = {
            apiKey: (env && env.VITE_FIREBASE_API_KEY) || "AIzaSyCg9ywrakadw11ql2Gl1-Ywc6r6_KDQZAY",
            authDomain: (env && env.VITE_FIREBASE_AUTH_DOMAIN) || "madpm-6a036.firebaseapp.com",
            projectId: (env && env.VITE_FIREBASE_PROJECT_ID) || "madpm-6a036",
            storageBucket: (env && env.VITE_FIREBASE_STORAGE_BUCKET) || "madpm-6a036.firebasestorage.app",
            messagingSenderId: (env && env.VITE_FIREBASE_MESSAGING_SENDER_ID) || "40453504945",
            appId: (env && env.VITE_FIREBASE_APP_ID) || "1:40453504945:web:52c0927e2f5f0bb5664790"
        };

        // Check if configuration parameters are populated and not default placeholders
        const isValid = Object.values(firebaseConfig).every(val => val && !val.includes('your_') && !val.includes('here'));

        if (isValid) {
            try {
                const app = initializeApp(firebaseConfig);
                db = getFirestore(app);
                useFirebase = true;
                console.log("🔥 Firebase Firestore connected successfully!");
            } catch (error) {
                console.error("Firebase init failed, falling back to LocalStorage:", error);
            }
        } else {
            console.log("Firebase config contains placeholders. Running in local mock mode.");
        }
    };

    // Initialize Firebase
    await initFirebase();

    // Initialize mock leads locally only if empty and not connected to Firebase
    const initializeMockLeads = () => {
        if (!useFirebase && !localStorage.getItem('madpm_leads')) {
            const mockLeads = [
                {
                    date: '2026-05-28',
                    name: 'Amara Vance',
                    email: 'amara.v@startupventures.com',
                    role: 'founder',
                    problem: 'Finding niche micro-influencers in clean-tech space for user interviews is incredibly slow.'
                },
                {
                    date: '2026-05-29',
                    name: 'Rohan Joshi',
                    email: 'rohan.pm@gmail.com',
                    role: 'solver',
                    problem: 'No portfolio tool allows displaying structural analytical skills (like HMWs, PRDs, wireframe user flows) in a readable single link.'
                },
                {
                    date: '2026-05-30',
                    name: 'Sarah Chen',
                    email: 'sarah.c@eduin.org',
                    role: 'observer',
                    problem: 'University course platforms lack peer-to-peer feedback systems on project workarounds.'
                }
            ];
            localStorage.setItem('madpm_leads', JSON.stringify(mockLeads));
        }
    };
    initializeMockLeads();

    // ----------------------------------------------------
    // Social Sharing Dynamic Setup
    // ----------------------------------------------------
    const setupSocialLinks = () => {
        const pageUrl = window.location.href.includes('file://') 
            ? 'https://madpm.co' // Muted fallback url for local tests
            : window.location.href;
            
        const textMessage = "Stop wasting time building products nobody wants! Check out MADpm, a community-driven repository to capture and validate real-world problems first:";
        const twitterMessage = "Master the problem before you build the solution. Check out MADpm, a community for problem-first validation:";
        
        const waLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(textMessage + " " + pageUrl)}`;
        const twLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterMessage)}&url=${encodeURIComponent(pageUrl)}`;
        const liLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;
        
        document.getElementById('share-whatsapp').href = waLink;
        document.getElementById('share-twitter').href = twLink;
        document.getElementById('share-linkedin').href = liLink;
        
        // Modal success sharing
        const modalWaBtn = document.getElementById('btn-share-modal-wa');
        if(modalWaBtn) {
            modalWaBtn.addEventListener('click', () => {
                window.open(waLink, '_blank');
            });
        }
    };
    setupSocialLinks();

    // ----------------------------------------------------
    // Early Access Modal Controls
    // ----------------------------------------------------
    const signupModal = document.getElementById('signup-modal');
    const openModalBtns = document.querySelectorAll('.open-early-access');
    const closeModalBtn = document.getElementById('close-modal');
    const signupForm = document.getElementById('early-access-form');
    const successState = document.getElementById('signup-success');

    const openModal = () => {
        signupModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        signupModal.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            signupForm.reset();
            signupForm.style.display = 'flex';
            successState.style.display = 'none';
        }, 300);
    };

    openModalBtns.forEach(btn => btn.addEventListener('click', openModal));
    closeModalBtn.addEventListener('click', closeModal);
    
    signupModal.addEventListener('click', (e) => {
        if (e.target === signupModal) closeModal();
    });

    // ----------------------------------------------------
    // Lead Capture & Firestore / LocalStorage Saving
    // ----------------------------------------------------
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('user-name').value;
        const email = document.getElementById('user-email').value;
        
        let selectedRole = 'solver';
        const roleRadios = document.getElementsByName('user-role');
        for (const radio of roleRadios) {
            if (radio.checked) {
                selectedRole = radio.value;
                break;
            }
        }
        
        const problemObserved = document.getElementById('user-problem').value;
        const signupDate = new Date().toISOString().split('T')[0];
        
        const newLead = {
            date: signupDate,
            name: name,
            email: email,
            role: selectedRole,
            problem: problemObserved || 'None logged.'
        };
        
        if (useFirebase) {
            try {
                await addDoc(collection(db, "leads"), newLead);
                console.log("Lead successfully written to Cloud Firestore!");
            } catch (err) {
                console.error("Firestore write failed. Falling back to local copy:", err);
                saveLocalLead(newLead);
            }
        } else {
            saveLocalLead(newLead);
        }
        
        // Toggle view to success message
        signupForm.style.display = 'none';
        successState.style.display = 'block';
    });


    // ----------------------------------------------------
    // Timeline Step-by-Step Simulator
    // ----------------------------------------------------
    let activeStep = 1;
    const totalSteps = 4;
    const simPrev = document.getElementById('sim-prev');
    const simNext = document.getElementById('sim-next');
    
    const updateSimulator = () => {
        document.querySelectorAll('.timeline-step').forEach((node, idx) => {
            if (idx + 1 <= activeStep) {
                node.classList.add('active');
            } else {
                node.classList.remove('active');
            }
        });

        document.querySelectorAll('.simulator-slides .slide').forEach((slide, idx) => {
            if (idx + 1 === activeStep) {
                slide.classList.add('active');
            } else {
                slide.classList.remove('active');
            }
        });

        simPrev.disabled = activeStep === 1;
        simNext.textContent = activeStep === totalSteps ? "Finish Journey" : "Next Step";
    };

    simPrev.addEventListener('click', () => {
        if (activeStep > 1) {
            activeStep--;
            updateSimulator();
        }
    });

    simNext.addEventListener('click', () => {
        if (activeStep < totalSteps) {
            activeStep++;
            updateSimulator();
        } else {
            openModal();
        }
    });

    document.querySelectorAll('.timeline-step').forEach((node) => {
        node.addEventListener('click', () => {
            activeStep = parseInt(node.getAttribute('data-step'));
            updateSimulator();
        });
    });

    // ----------------------------------------------------
    // Persona Tab Switcher
    // ----------------------------------------------------
    const tabs = document.querySelectorAll('.persona-tab');
    const panes = document.querySelectorAll('.persona-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetPersona = tab.getAttribute('data-persona');
            
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            panes.forEach(pane => {
                if (pane.id === `pane-${targetPersona}`) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });
        });
    });

    // ----------------------------------------------------
    // Creator Admin Dashboard Panel (Firebase Ready)
    // ----------------------------------------------------
    const adminModal = document.getElementById('admin-modal');
    const openAdminBtn = document.getElementById('open-admin');
    const closeAdminModalBtn = document.getElementById('close-admin-modal');
    const leadsTableBody = document.getElementById('leads-table-body');
    const noLeadsMsg = document.getElementById('no-leads');
    const btnExportCSV = document.getElementById('btn-export-csv');
    const btnClearLeads = document.getElementById('btn-clear-leads');

    let cachedLeads = []; // Keeps reference for CSV exports

    const openAdminDashboard = async (e) => {
        if(e) e.preventDefault();
        
        leadsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">⌛ Loading leads...</td></tr>';
        noLeadsMsg.style.display = 'none';
        document.getElementById('leads-table').style.display = 'table';
        
        cachedLeads = [];
        
        if (useFirebase) {
            try {
                const q = query(collection(db, "leads"), orderBy("date", "desc"));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => {
                    cachedLeads.push({ id: doc.id, ...doc.data() });
                });
            } catch (err) {
                console.error("Error reading from Firestore: ", err);
                cachedLeads = getLocalLeads().reverse();
            }
        } else {
            cachedLeads = getLocalLeads().reverse();
        }

        leadsTableBody.innerHTML = '';
        
        if (cachedLeads.length === 0) {
            noLeadsMsg.style.display = 'block';
            document.getElementById('leads-table').style.display = 'none';
        } else {
            noLeadsMsg.style.display = 'none';
            document.getElementById('leads-table').style.display = 'table';
            
            cachedLeads.forEach(lead => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${lead.date}</td>
                    <td><strong>${escapeHtml(lead.name)}</strong></td>
                    <td>${escapeHtml(lead.email)}</td>
                    <td><span class="v-pill" style="padding: 2px 8px; font-size: 0.65rem;">${lead.role}</span></td>
                    <td style="max-width: 300px; word-break: break-word;">${escapeHtml(lead.problem)}</td>
                `;
                leadsTableBody.appendChild(tr);
            });
        }
        
        adminModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeAdminDashboard = () => {
        adminModal.classList.remove('active');
        document.body.style.overflow = '';
    };

    openAdminBtn.addEventListener('click', openAdminDashboard);
    closeAdminModalBtn.addEventListener('click', closeAdminDashboard);
    adminModal.addEventListener('click', (e) => {
        if (e.target === adminModal) closeAdminDashboard();
    });

    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.innerText = text;
        return div.innerHTML;
    };

    // CSV Exporter using Cached Leads
    btnExportCSV.addEventListener('click', () => {
        if (cachedLeads.length === 0) {
            alert('No leads to export!');
            return;
        }
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Date,Name,Email,Role,Problem Observation\r\n";
        
        cachedLeads.forEach(lead => {
            const cleanName = lead.name.replace(/"/g, '""');
            const cleanEmail = lead.email.replace(/"/g, '""');
            const cleanRole = lead.role.replace(/"/g, '""');
            const cleanProblem = lead.problem.replace(/"/g, '""');
            
            csvContent += `"${lead.date}","${cleanName}","${cleanEmail}","${cleanRole}","${cleanProblem}"\r\n`;
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `madpm_leads_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        
        link.click();
        document.body.removeChild(link);
    });

    // Clear Database (both LocalStorage and Firestore)
    btnClearLeads.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear all leads? This resets local records and deletes docs from your Firebase Collection.')) {
            if (useFirebase) {
                try {
                    const querySnapshot = await getDocs(collection(db, "leads"));
                    const deletePromises = [];
                    querySnapshot.forEach((docSnap) => {
                        deletePromises.push(deleteDoc(doc(db, "leads", docSnap.id)));
                    });
                    await Promise.all(deletePromises);
                    console.log("All leads deleted from Cloud Firestore!");
                } catch (err) {
                    console.error("Firestore database clearing failed: ", err);
                }
            }
            
            localStorage.setItem('madpm_leads', '[]');
            await openAdminDashboard();
        }
    });
});
