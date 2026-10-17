import React, { useRef, useState, useEffect } from "react";

// Direct connection to live HR CRM backend
const API_BASE_URL = 'https://hr-crm-backend-r7w3.onrender.com/api';

const initialCompanyExperience = {
    companyName: "",
    managerName: "",
    designation: "",
    duration: "",
};

const initialFormData = {
    fullName: "",
    mobile: "",
    email: "",
    location: "",
    qualification: "",
    college: "",
    passingYear: "",
    experience: "",
    previousCompanies: [
        { ...initialCompanyExperience }
    ],
    skills: "",
    languages: "",
    company: "1",
    department: "1",
    process: "",
    appliedRole: "Telecaller",
    resume: null,
};

const CandidateRegistration = () => {
    const [formData, setFormData] = useState(initialFormData);
    const [submitted, setSubmitted] = useState(false);
    const [submittedInfo, setSubmittedInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Resume OCR & Scan State
    const [scanning, setScanning] = useState(false);
    const [scanStage, setScanStage] = useState("");
    const [scanProgress, setScanProgress] = useState(0);
    const [scanResult, setScanResult] = useState(null);
    const [scanError, setScanError] = useState(null);
    const [duplicateWarning, setDuplicateWarning] = useState([]);
    const [autoFilledFields, setAutoFilledFields] = useState(new Set());
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Visibility toggles for streamlined UX
    const [hasUploadedResume, setHasUploadedResume] = useState(false);
    const [showPersonalDetails, setShowPersonalDetails] = useState(false);

    const fileInputRef = useRef(null);
    const scanInputRef = useRef(null);

    // Clean up preview blob URL on unmount
    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // Process list based on department
    const processesByDepartment = {
        "1": [
            { id: 1, name: "Skip tracing" },
            { id: 2, name: "PIVC" },
        ],
        "2": [
            { id: 3, name: "BHFL" },
            { id: 4, name: "Bajaj SME" },
            { id: 5, name: "Bajaj write off" },
            { id: 6, name: "DBS write off" },
            { id: 7, name: "DBS north" },
            { id: 8, name: "DBS east" },
            { id: 9, name: "DBS west" },
        ],
        "3": [],
        "4": [],
        "5": [],
    };

    const getInputStyle = (fieldName) => ({
        ...styles.input,
        borderColor: errors[fieldName] ? "#dc2626" : autoFilledFields.has(fieldName) ? "#2563eb" : "#d6dae1",
        ...(errors[fieldName] ? { boxShadow: "0 0 0 1px #dc2626" } : {}),
        ...(autoFilledFields.has(fieldName) && !errors[fieldName] ? { background: "#f8faff" } : {}),
    });

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        const newFile = files ? files[0] : null;

        if (files && newFile) {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl(URL.createObjectURL(newFile));
            setHasUploadedResume(true);
        }

        setFormData((prev) => ({
            ...prev,
            [name]: newFile || value,
            ...(name === "department" ? { process: "" } : {}),
        }));

        if (errors[name] || errors[name.toLowerCase()]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                delete next[name.toLowerCase()];
                return next;
            });
        }
    };

    /**
     * Handlers for Multiple Previous Companies Experience
     */
    const handleAddCompany = () => {
        setFormData((prev) => ({
            ...prev,
            previousCompanies: [
                ...(prev.previousCompanies || []),
                { ...initialCompanyExperience },
            ],
        }));
    };

    const handleRemoveCompany = (indexToRemove) => {
        setFormData((prev) => {
            const list = prev.previousCompanies || [];
            if (list.length <= 1) {
                return {
                    ...prev,
                    previousCompanies: [{ ...initialCompanyExperience }],
                };
            }
            return {
                ...prev,
                previousCompanies: list.filter((_, idx) => idx !== indexToRemove),
            };
        });
    };

    const handleCompanyChange = (index, field, value) => {
        setFormData((prev) => {
            const list = [...(prev.previousCompanies || [{ ...initialCompanyExperience }])];
            if (!list[index]) {
                list[index] = { ...initialCompanyExperience };
            }
            list[index] = {
                ...list[index],
                [field]: value,
            };
            return {
                ...prev,
                previousCompanies: list,
            };
        });
    };

    /**
     * Handles Upload & Scan Resume (OCR / Text extraction)
     */
    const handleScanResume = async (fileToScan) => {
        const file = fileToScan || formData.resume;
        if (!file) {
            setScanError("Please select a resume file (PDF, DOCX, JPG, PNG) first.");
            return;
        }

        // Validate file type
        const allowedExtensions = ['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png'];
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            setScanError(`Unsupported file format (${ext}). Supported formats: PDF, DOCX, JPG, PNG.`);
            return;
        }

        // Validate size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            setScanError("File is too large. Maximum allowed size is 10 MB.");
            return;
        }

        setScanning(true);
        setScanError(null);
        setScanResult(null);
        setDuplicateWarning([]);
        setScanStage("Uploading resume document...");
        setScanProgress(25);

        // Keep local object URL for preview
        const objUrl = URL.createObjectURL(file);
        setPreviewUrl(objUrl);
        setHasUploadedResume(true);

        try {
            const scanData = new FormData();
            scanData.append("resume", file);

            const stageTimer1 = setTimeout(() => {
                setScanStage("Analyzing document & extracting text...");
                setScanProgress(55);
            }, 600);

            const stageTimer2 = setTimeout(() => {
                setScanStage("Running OCR & extracting candidate fields...");
                setScanProgress(80);
            }, 1400);

            const token = localStorage.getItem('talentdesk.token');
            const scanHeaders = {};
            if (token) {
                scanHeaders['Authorization'] = `Bearer ${token}`;
            }

            const scanEndpoint = `${API_BASE_URL}/public/resumes/extract`;

            let response;
            try {
                response = await fetch(scanEndpoint, {
                    method: "POST",
                    headers: scanHeaders,
                    body: scanData,
                });
            } catch (netErr) {
                response = await fetch(`${API_BASE_URL}/resumes/extract`, {
                    method: "POST",
                    headers: scanHeaders,
                    body: scanData,
                });
            }

            clearTimeout(stageTimer1);
            clearTimeout(stageTimer2);
            setScanProgress(100);

            const resJson = await response.json();

            if (!response.ok) {
                const errMsg = resJson?.error?.message || "Failed to scan and extract resume.";
                throw new Error(errMsg);
            }

            const extracted = resJson.data || {};
            const newlyPopulated = new Set();

            setFormData((prev) => {
                const updated = { ...prev, resume: file };

                const setIfPresent = (field, newVal) => {
                    if (newVal !== undefined && newVal !== null && newVal !== '') {
                        updated[field] = newVal;
                        newlyPopulated.add(field);
                    }
                };

                setIfPresent("fullName", extracted.full_name);
                setIfPresent("mobile", extracted.phone);
                setIfPresent("email", extracted.email);
                setIfPresent("location", extracted.location);
                setIfPresent("qualification", extracted.education);
                setIfPresent("college", extracted.college);
                setIfPresent("passingYear", extracted.graduation_year);
                setIfPresent("skills", extracted.skills_text);

                if (extracted.languages && extracted.languages.length > 0) {
                    setIfPresent("languages", extracted.languages.join(", "));
                }

                // Experience Level
                if (extracted.experience_level) {
                    setIfPresent("experience", extracted.experience_level);
                } else if (extracted.experience_years !== undefined && extracted.experience_years !== null) {
                    const yrs = extracted.experience_years;
                    if (yrs <= 0.5) setIfPresent("experience", "Fresher");
                    else if (yrs <= 1) setIfPresent("experience", "0-1");
                    else if (yrs <= 2) setIfPresent("experience", "1-2");
                    else if (yrs <= 5) setIfPresent("experience", "2-5");
                    else setIfPresent("experience", "5+");
                }

                // Set Previous Company & Manager
                const extractedCompany = extracted.previous_company || "";
                const extractedManager = extracted.manager_name || "";
                const extractedRole = extracted.previous_designation || "";
                const expDuration = extracted.experience_years ? `${extracted.experience_years} Years` : "";

                updated.previousCompanies = [
                    {
                        companyName: extractedCompany,
                        managerName: extractedManager,
                        designation: extractedRole,
                        duration: expDuration,
                    }
                ];

                if (extracted.applied_role || extractedRole) {
                    setIfPresent("appliedRole", extracted.applied_role || extractedRole);
                }

                return updated;
            });

            setAutoFilledFields(newlyPopulated);

            // Duplicate detection check
            if (extracted.possible_duplicates && extracted.possible_duplicates.length > 0) {
                setDuplicateWarning(extracted.possible_duplicates);
            }

            setScanResult({
                method: extracted.extraction_method || 'direct',
                fieldsCount: newlyPopulated.size,
                rawLength: extracted.raw_text_length || 0,
                warning: extracted.warning
            });

            setScanStage("Complete!");

            // HIDE personal details automatically after upload scanner
            // Only show important options (experience, previous company, TL/manager name)
            setShowPersonalDetails(false);

        } catch (err) {
            console.error("Resume scan error:", err);
            setScanError(err.message || "Unable to scan resume. You can still fill the form manually.");
        } finally {
            setScanning(false);
        }
    };

    /**
     * File input change handler for the scanner dropzone
     */
    const handleScannerFileSelected = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData((prev) => ({ ...prev, resume: file }));
            handleScanResume(file);
        }
    };

    /**
     * Trigger rescan
     */
    const handleRescan = () => {
        if (scanInputRef.current) {
            scanInputRef.current.value = "";
            scanInputRef.current.click();
        }
    };

    /**
     * Reset and register another candidate
     */
    const handleRegisterAnother = () => {
        setSubmitted(false);
        setSubmittedInfo(null);
        setFormData(initialFormData);
        setHasUploadedResume(false);
        setShowPersonalDetails(false);
        setScanResult(null);
        setDuplicateWarning([]);
        setAutoFilledFields(new Set());
        setErrors({});
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (scanInputRef.current) scanInputRef.current.value = "";
    };

    /**
     * Form Submission (Persist candidate to PostgreSQL)
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        setLoading(true);
        setErrors({});

        // Validate basic required fields
        const validationErrors = {};
        if (!formData.fullName || !formData.fullName.trim()) {
            validationErrors.fullName = "Full name is required.";
        }
        if (!formData.mobile || !formData.mobile.trim()) {
            validationErrors.mobile = "Mobile number is required.";
        }
        if (!formData.resume) {
            validationErrors.resume = "Please attach or scan candidate resume.";
        }

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            if (validationErrors.fullName || validationErrors.mobile) {
                setShowPersonalDetails(true);
                alert("Please verify Candidate Full Name and Mobile Number.");
            } else if (validationErrors.resume) {
                alert("Please upload or scan a resume at the top before submitting.");
                scanInputRef.current?.click();
            }
            setLoading(false);
            return;
        }

        try {
            const data = new FormData();

            // Personal information (from resume extraction or manual edit)
            data.append("full_name", (formData.fullName || "").trim());
            data.append("phone", (formData.mobile || "").replace(/[\s()-]/g, ""));
            data.append("email", formData.email ? formData.email.trim().toLowerCase() : "");
            data.append("location", (formData.location || "").trim());
            data.append("education", (formData.qualification || "").trim());

            if (formData.passingYear) {
                data.append("passing_year", formData.passingYear);
            }

            // Experience in Years
            let experienceYears = 0;
            if (formData.experience === "Fresher") experienceYears = 0;
            else if (formData.experience === "0-1") experienceYears = 1;
            else if (formData.experience === "1-2") experienceYears = 2;
            else if (formData.experience === "2-5") experienceYears = 3;
            else if (formData.experience === "5+") experienceYears = 5;

            data.append("experience_years", experienceYears);

            // Skills & Languages
            if (formData.skills) {
                data.append("skills", formData.skills);
            }
            if (formData.languages) {
                data.append("languages", formData.languages);
            }

            // Compile Work Experience History (Previous Companies, TL/Manager Name, Role)
            const compNotes = [];
            (formData.previousCompanies || []).forEach((comp, idx) => {
                const parts = [];
                if (comp.companyName) parts.push(`Company: ${comp.companyName.trim()}`);
                if (comp.managerName) parts.push(`TL/Manager: ${comp.managerName.trim()}`);
                if (comp.designation) parts.push(`Role: ${comp.designation.trim()}`);
                if (comp.duration) parts.push(`Duration: ${comp.duration.trim()}`);
                if (parts.length > 0) {
                    compNotes.push(`[Company #${idx + 1}] ${parts.join(', ')}`);
                }
            });

            const notesArr = [];
            if (formData.college) notesArr.push(`College: ${formData.college}`);
            if (compNotes.length > 0) {
                notesArr.push(`Previous Companies & TL/Managers: ${compNotes.join(' | ')}`);
            }
            if (notesArr.length > 0) {
                data.append("notes", notesArr.join(" \n "));
            }

            // Default Company, Department, Applied Role for background recruitment assignment
            const companyId = formData.company || "1";
            const departmentId = formData.department || "1";
            const appliedRole = formData.appliedRole || "Telecaller";

            data.append("company_id", companyId);
            data.append("department_id", departmentId);
            if (formData.process) {
                data.append("process_id", formData.process);
            }
            data.append("applied_role", appliedRole);
            data.append("source", "Walk-in");

            // Attach resume file
            if (formData.resume) {
                data.append("resume", formData.resume);
            }

            console.log("Submitting candidate to PostgreSQL database...");

            const response = await fetch(
                `${API_BASE_URL}/public/candidate-registration`,
                {
                    method: "POST",
                    body: data,
                }
            );

            const result = await response.json();

            if (!response.ok) {
                console.error("Registration failed:", result);
                const fieldErrors = result?.error?.fields || {};
                const normalized = {};

                for (const [key, msg] of Object.entries(fieldErrors)) {
                    const clean = key.replace(/\.\d+$/, "");
                    normalized[clean] = msg;
                    if (clean === "full_name") normalized.fullName = msg;
                    if (clean === "phone") normalized.mobile = msg;
                    if (clean === "education") normalized.qualification = msg;
                    if (clean === "passing_year") normalized.passingYear = msg;
                    if (clean === "applied_role") normalized.appliedRole = msg;
                    if (clean === "company_id") normalized.company = msg;
                    if (clean === "department_id") normalized.department = msg;
                    if (clean === "process_id") normalized.process = msg;
                }

                setErrors(normalized);
                alert(result?.error?.message || "Failed to submit application. Please check your inputs.");
                return;
            }

            // Success: save submission information
            const validCompanies = (formData.previousCompanies || []).filter(c => c.companyName || c.managerName);
            setSubmittedInfo({
                id: result.data?.candidate?.id,
                name: result.data?.candidate?.full_name || formData.fullName,
                role: result.data?.application?.applied_role || formData.appliedRole,
                companyId: formData.company,
                departmentId: formData.department,
                companies: validCompanies,
                resumeName: formData.resume?.name || "Uploaded Resume",
            });

            // Set submitted to TRUE
            // NOTE: When submitted === true, ONLY the success message is shown, NOT the empty form!
            setSubmitted(true);

            // Notify open Dashboard tabs immediately in real-time
            try {
                const bc = new BroadcastChannel("talentdesk-notifications");
                bc.postMessage({
                    type: "NEW_CANDIDATE",
                    candidate: result.data?.candidate,
                    application: result.data?.application,
                });
                bc.close();
            } catch (_) {}

            try {
                localStorage.setItem(
                    "talentdesk_realtime_event",
                    JSON.stringify({
                        type: "NEW_CANDIDATE",
                        timestamp: Date.now(),
                        candidate: result.data?.candidate,
                        application: result.data?.application,
                    })
                );
            } catch (_) {}

            // Reset form state so that no stale state is held
            setFormData(initialFormData);
            setHasUploadedResume(false);
            setShowPersonalDetails(false);
            setScanResult(null);
            setDuplicateWarning([]);
            setAutoFilledFields(new Set());

            if (fileInputRef.current) fileInputRef.current.value = "";
            if (scanInputRef.current) scanInputRef.current.value = "";

        } catch (error) {
            console.error("Registration error:", error);
            alert("Unable to connect to the server. Please make sure the backend is running.");
        } finally {
            setLoading(false);
        }
    };

    const availableProcesses = processesByDepartment[formData.department] || [];

    return (
        <div style={styles.page}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerContent}>
                    <div>
                        <div style={styles.brand}>Talentdesk HR CRM</div>
                        <div style={styles.brandSubtext}>Candidate Application & OCR Resume Portal</div>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <div style={styles.headerBadge}>Career Opportunities</div>
                    </div>
                </div>
            </header>

            <main style={styles.main}>
                {/* Page Heading */}
                <div style={styles.pageHeading}>
                    <h1 style={styles.title}>Candidate Registration</h1>
                    <p style={styles.subtitle}>
                        Upload or scan your resume. Your profile is automatically parsed, showing only the important work experience and role details.
                    </p>
                </div>

                {/* ========================================================================= */}
                {/* SUBMITTED SUCCESS VIEW: ONLY SHOW SUCCESS MESSAGE, NOT EMPTY FORM */}
                {/* ========================================================================= */}
                {submitted ? (
                    <div style={styles.successScreenCard}>
                        <div style={styles.successIconLarge}>✓</div>
                        <h2 style={styles.successTitle}>Application Submitted Successfully!</h2>
                        <p style={styles.successSubtitle}>
                            Thank you! Your application and resume have been submitted successfully.
                        </p>
                    </div>
                ) : (
                    /* ========================================================================= */
                    /* ACTIVE REGISTRATION FORM (SHOWN BEFORE SUBMISSION) */
                    /* ========================================================================= */
                    <>
                        {/* OCR RESUME SCANNER & UPLOAD CARD */}
                        <section style={styles.scannerCard}>
                            <div style={styles.scannerHeader}>
                                <div style={styles.scannerBadge}>
                                    <span style={{ fontSize: "16px" }}>⚡</span> OCR Resume Scanner
                                </div>
                                <div style={styles.formatPills}>
                                    <span style={styles.formatTag}>PDF</span>
                                    <span style={styles.formatTag}>Scanned PDF</span>
                                    <span style={styles.formatTag}>DOCX</span>
                                    <span style={styles.formatTag}>JPG / PNG</span>
                                    <span style={{ fontSize: "11px", color: "#64748b" }}>Max 10MB</span>
                                </div>
                            </div>

                            <div style={styles.scannerBody}>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
                                        Upload & Scan Resume
                                    </h3>
                                    <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
                                        Upload your resume document. Text and identity details are extracted automatically in the background, keeping your screen clean and focused on experience details.
                                    </p>
                                </div>

                                <div style={styles.scannerActions}>
                                    <input
                                        ref={scanInputRef}
                                        type="file"
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,image/*"
                                        onChange={handleScannerFileSelected}
                                        style={{ display: "none" }}
                                    />

                                    <button
                                        type="button"
                                        onClick={() => scanInputRef.current?.click()}
                                        disabled={scanning}
                                        style={{
                                            ...styles.scanButton,
                                            opacity: scanning ? 0.7 : 1,
                                            cursor: scanning ? "wait" : "pointer",
                                        }}
                                    >
                                        <span style={{ fontSize: "16px" }}>📁</span>
                                        {scanning ? "Scanning Resume..." : "Upload & Scan Resume"}
                                    </button>

                                    {formData.resume && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={handleRescan}
                                                disabled={scanning}
                                                style={styles.rescanButton}
                                                title="Select a different resume to scan"
                                            >
                                                ↺ Rescan
                                            </button>

                                            {previewUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPreviewModal(true)}
                                                    style={styles.previewButton}
                                                    title="Preview uploaded resume"
                                                >
                                                    👁 Preview
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Scanning Progress Indicator */}
                            {scanning && (
                                <div style={styles.progressContainer}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                        <span style={{ fontSize: "13px", fontWeight: "600", color: "#1e293b" }}>
                                            {scanStage}
                                        </span>
                                        <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: "700" }}>
                                            {scanProgress}%
                                        </span>
                                    </div>
                                    <div style={styles.progressBarTrack}>
                                        <div
                                            style={{
                                                ...styles.progressBarFill,
                                                width: `${scanProgress}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Scan Error Message */}
                            {scanError && (
                                <div style={styles.scanErrorBanner}>
                                    <span style={{ fontWeight: "700", marginRight: "8px" }}>⚠️ Error:</span>
                                    <span>{scanError}</span>
                                    <button
                                        type="button"
                                        onClick={() => setScanError(null)}
                                        style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", fontSize: "16px" }}
                                    >
                                        ×
                                    </button>
                                </div>
                            )}

                            {/* Scan Success Banner */}
                            {scanResult && !scanning && (
                                <div style={styles.scanSuccessBanner}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div style={styles.miniCheck}>✓</div>
                                        <div>
                                            <div style={{ fontSize: "14px", fontWeight: "700", color: "#166534" }}>
                                                Resume Scanned Successfully
                                            </div>
                                            <div style={{ fontSize: "12px", color: "#15803d", marginTop: "2px" }}>
                                                Candidate details extracted. Please fill in your experience and previous company info below.
                                            </div>
                                        </div>
                                    </div>
                                    {formData.resume && (
                                        <span style={{ fontSize: "12px", background: "#dcfce7", padding: "4px 8px", borderRadius: "4px", color: "#166534", fontWeight: "600" }}>
                                            📄 {formData.resume.name}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Duplicate Detection Warning */}
                            {duplicateWarning.length > 0 && (
                                <div style={styles.duplicateWarningBox}>
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                                        <span style={{ fontSize: "20px" }}>⚠️</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: "14px", fontWeight: "700", color: "#92400e" }}>
                                                Possible Duplicate Candidate Detected!
                                            </div>
                                            <p style={{ margin: "4px 0 8px 0", fontSize: "13px", color: "#78350f" }}>
                                                A candidate with this phone or email already exists in the database:
                                            </p>
                                            <div style={styles.duplicateList}>
                                                {duplicateWarning.map((dup) => (
                                                    <div key={dup.id} style={styles.duplicateItem}>
                                                        <strong>{dup.full_name}</strong> (ID: #{dup.id}) — Phone: {dup.phone || 'N/A'}, Email: {dup.email || 'N/A'}
                                                        {dup.open_application_stage && (
                                                            <span style={styles.stagePill}>Stage: {dup.open_application_stage}</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* ========================================================================= */}
                        {/* EXTRACTED CANDIDATE SUMMARY CARD */}
                        {/* (DETAILS ARE COMPACT & HIDDEN BY DEFAULT; CAN TOGGLE IF NEEDED) */}
                        {/* ========================================================================= */}
                        {(hasUploadedResume || formData.resume) && (
                            <div style={styles.extractedSummaryCard}>
                                <div style={styles.extractedSummaryHeader}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <div style={styles.extractedAvatar}>
                                            {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : "👤"}
                                        </div>
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                                <span style={styles.extractedName}>
                                                    {formData.fullName || "Candidate Resume Uploaded"}
                                                </span>
                                                <span style={styles.extractedBadge}>✨ Resume Extracted</span>
                                            </div>
                                            <div style={styles.extractedMeta}>
                                                {formData.mobile && <span>📞 {formData.mobile}</span>}
                                                {formData.email && <span>✉️ {formData.email}</span>}
                                                {formData.qualification && <span>🎓 {formData.qualification}</span>}
                                                {formData.location && <span>📍 {formData.location}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                                        {previewUrl && (
                                            <button
                                                type="button"
                                                onClick={() => setShowPreviewModal(true)}
                                                style={styles.smallPreviewBtn}
                                            >
                                                👁 View Resume
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setShowPersonalDetails(!showPersonalDetails)}
                                            style={styles.toggleDetailsBtn}
                                        >
                                            {showPersonalDetails ? "▲ Hide Details" : "✏️ Edit Basic Details"}
                                        </button>
                                    </div>
                                </div>

                                {/* Collapsible Personal Details (Only if user chooses to verify or edit) */}
                                {showPersonalDetails && (
                                    <div style={styles.collapsiblePersonalBox}>
                                        <div style={{ marginBottom: "14px", fontSize: "12px", color: "#64748b" }}>
                                            The fields below were auto-filled from your resume. Modify only if there is a correction needed:
                                        </div>
                                        <div style={styles.grid}>
                                            <FormField
                                                label="Full Name"
                                                required
                                                autoFilled={autoFilledFields.has("fullName")}
                                                error={errors.fullName}
                                                input={
                                                    <input
                                                        type="text"
                                                        name="fullName"
                                                        value={formData.fullName}
                                                        onChange={handleChange}
                                                        placeholder="Enter full name"
                                                        style={getInputStyle("fullName")}
                                                        required
                                                    />
                                                }
                                            />

                                            <FormField
                                                label="Mobile Number"
                                                required
                                                autoFilled={autoFilledFields.has("mobile")}
                                                error={errors.mobile}
                                                input={
                                                    <input
                                                        type="tel"
                                                        name="mobile"
                                                        value={formData.mobile}
                                                        onChange={handleChange}
                                                        placeholder="10-digit mobile number"
                                                        style={getInputStyle("mobile")}
                                                        required
                                                    />
                                                }
                                            />

                                            <FormField
                                                label="Email Address"
                                                autoFilled={autoFilledFields.has("email")}
                                                error={errors.email}
                                                input={
                                                    <input
                                                        type="email"
                                                        name="email"
                                                        value={formData.email}
                                                        onChange={handleChange}
                                                        placeholder="candidate@example.com"
                                                        style={getInputStyle("email")}
                                                    />
                                                }
                                            />

                                            <FormField
                                                label="Location / City"
                                                autoFilled={autoFilledFields.has("location")}
                                                error={errors.location}
                                                input={
                                                    <input
                                                        type="text"
                                                        name="location"
                                                        value={formData.location}
                                                        onChange={handleChange}
                                                        placeholder="e.g. Pune, Maharashtra"
                                                        style={getInputStyle("location")}
                                                    />
                                                }
                                            />

                                            <FormField
                                                label="Highest Qualification"
                                                autoFilled={autoFilledFields.has("qualification")}
                                                error={errors.qualification}
                                                input={
                                                    <input
                                                        type="text"
                                                        name="qualification"
                                                        value={formData.qualification}
                                                        onChange={handleChange}
                                                        placeholder="e.g. B.Tech, B.Com, MBA"
                                                        style={getInputStyle("qualification")}
                                                    />
                                                }
                                            />

                                            <FormField
                                                label="College / University"
                                                autoFilled={autoFilledFields.has("college")}
                                                error={errors.college}
                                                input={
                                                    <input
                                                        type="text"
                                                        name="college"
                                                        value={formData.college}
                                                        onChange={handleChange}
                                                        placeholder="e.g. Pune University"
                                                        style={getInputStyle("college")}
                                                    />
                                                }
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notice if no resume has been uploaded yet */}
                        {!hasUploadedResume && !formData.resume && (
                            <div style={styles.manualEntryBanner}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                                    <div style={{ fontSize: "13px", color: "#475569" }}>
                                        💡 <strong>Tip:</strong> Uploading your resume auto-fills all details. Or you can enter basic details manually:
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowPersonalDetails(!showPersonalDetails)}
                                        style={styles.toggleManualBtn}
                                    >
                                        {showPersonalDetails ? "Hide Manual Fields" : "Enter Details Manually"}
                                    </button>
                                </div>

                                {showPersonalDetails && (
                                    <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
                                        <div style={styles.grid}>
                                            <FormField
                                                label="Full Name"
                                                required
                                                error={errors.fullName}
                                                input={
                                                    <input
                                                        type="text"
                                                        name="fullName"
                                                        value={formData.fullName}
                                                        onChange={handleChange}
                                                        placeholder="Enter full name"
                                                        style={getInputStyle("fullName")}
                                                        required
                                                    />
                                                }
                                            />
                                            <FormField
                                                label="Mobile Number"
                                                required
                                                error={errors.mobile}
                                                input={
                                                    <input
                                                        type="tel"
                                                        name="mobile"
                                                        value={formData.mobile}
                                                        onChange={handleChange}
                                                        placeholder="10-digit mobile number"
                                                        style={getInputStyle("mobile")}
                                                        required
                                                    />
                                                }
                                            />
                                            <FormField
                                                label="Email Address"
                                                error={errors.email}
                                                input={
                                                    <input
                                                        type="email"
                                                        name="email"
                                                        value={formData.email}
                                                        onChange={handleChange}
                                                        placeholder="candidate@example.com"
                                                        style={getInputStyle("email")}
                                                    />
                                                }
                                            />
                                            <FormField
                                                label="Highest Qualification"
                                                error={errors.qualification}
                                                input={
                                                    <input
                                                        type="text"
                                                        name="qualification"
                                                        value={formData.qualification}
                                                        onChange={handleChange}
                                                        placeholder="e.g. Graduate / B.Com / MBA"
                                                        style={getInputStyle("qualification")}
                                                    />
                                                }
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* FORM: ONLY IMPORTANT & NEEDED OPTIONS */}
                        <form onSubmit={handleSubmit}>
                            {/* ========================================================= */}
                            {/* SECTION 1: WORK EXPERIENCE & PREVIOUS COMPANIES */}
                            {/* ========================================================= */}
                            <section style={styles.section}>
                                <div style={styles.sectionHeader}>
                                    <div style={styles.sectionNumber}>💼</div>
                                    <div>
                                        <h2 style={styles.sectionTitle}>Work Experience & Previous Employment</h2>
                                        <p style={styles.sectionDescription}>
                                            Select experience level, previous company, and TL / manager name. Use "+ Add More" for additional companies.
                                        </p>
                                    </div>
                                </div>

                                {/* Total Experience Dropdown */}
                                <div style={{ marginBottom: "22px" }}>
                                    <FormField
                                        label="Total Work Experience"
                                        required
                                        autoFilled={autoFilledFields.has("experience")}
                                        error={errors.experience}
                                        input={
                                            <select
                                                name="experience"
                                                value={formData.experience}
                                                onChange={handleChange}
                                                style={getInputStyle("experience")}
                                                required
                                            >
                                                <option value="">Select experience level</option>
                                                <option value="Fresher">Fresher (0 years)</option>
                                                <option value="0-1">0–1 Year</option>
                                                <option value="1-2">1–2 Years</option>
                                                <option value="2-5">2–5 Years</option>
                                                <option value="5+">5+ Years</option>
                                            </select>
                                        }
                                    />
                                </div>

                                {/* If Fresher is selected */}
                                {formData.experience === "Fresher" ? (
                                    <div style={styles.fresherPillBox}>
                                        <span style={{ fontSize: "24px" }}>🎓</span>
                                        <div>
                                            <div style={{ fontWeight: "700", color: "#1e3a8a", fontSize: "14px" }}>
                                                Fresher Candidate Selected
                                            </div>
                                            <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#475569" }}>
                                                No previous company or manager details are required for freshers. You can proceed directly to preferred role and department below.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    /* Previous Companies with TL / Manager Name & Add More Option */
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                                            <label style={{ ...styles.label, margin: 0, fontSize: "14px", fontWeight: "700" }}>
                                                Previous Company & Manager Details
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleAddCompany}
                                                style={styles.addCompanyBtn}
                                            >
                                                + Add More Company Experience
                                            </button>
                                        </div>

                                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                            {formData.previousCompanies.map((comp, idx) => (
                                                <div key={idx} style={styles.companyExperienceCard}>
                                                    <div style={styles.companyCardHeader}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                            <span style={styles.companyBadgeNumber}>#{idx + 1}</span>
                                                            <span style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                                                                {idx === 0 ? "Previous Company (Most Recent)" : `Other Company Experience #${idx + 1}`}
                                                            </span>
                                                        </div>
                                                        {formData.previousCompanies.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveCompany(idx)}
                                                                style={styles.removeCompanyBtn}
                                                                title="Remove this company entry"
                                                            >
                                                                ✕ Remove
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div style={styles.grid}>
                                                        {/* Previous Company Name */}
                                                        <FormField
                                                            label="Previous Company Name"
                                                            required={idx === 0 && formData.experience && formData.experience !== "Fresher"}
                                                            input={
                                                                <input
                                                                    type="text"
                                                                    value={comp.companyName}
                                                                    onChange={(e) => handleCompanyChange(idx, "companyName", e.target.value)}
                                                                    placeholder="e.g. Mpower / ABC Tech / Bajaj Finserv"
                                                                    style={styles.input}
                                                                    required={idx === 0 && formData.experience && formData.experience !== "Fresher"}
                                                                />
                                                            }
                                                        />

                                                        {/* TL or Manager Name of Previous Company */}
                                                        <FormField
                                                            label="TL or Manager Name of Previous Company"
                                                            required={idx === 0 && formData.experience && formData.experience !== "Fresher"}
                                                            input={
                                                                <input
                                                                    type="text"
                                                                    value={comp.managerName}
                                                                    onChange={(e) => handleCompanyChange(idx, "managerName", e.target.value)}
                                                                    placeholder="e.g. Mr. Rajesh Sharma (Team Leader / Reporting Manager)"
                                                                    style={styles.input}
                                                                    required={idx === 0 && formData.experience && formData.experience !== "Fresher"}
                                                                />
                                                            }
                                                        />

                                                        {/* Designation / Role in Previous Company */}
                                                        <FormField
                                                            label="Designation / Role"
                                                            input={
                                                                <input
                                                                    type="text"
                                                                    value={comp.designation}
                                                                    onChange={(e) => handleCompanyChange(idx, "designation", e.target.value)}
                                                                    placeholder="e.g. Telecaller / Sr. Executive"
                                                                    style={styles.input}
                                                                />
                                                            }
                                                        />

                                                        {/* Duration / Period */}
                                                        <FormField
                                                            label="Duration / Period of Experience"
                                                            input={
                                                                <input
                                                                    type="text"
                                                                    value={comp.duration}
                                                                    onChange={(e) => handleCompanyChange(idx, "duration", e.target.value)}
                                                                    placeholder="e.g. 1 Year 6 Months"
                                                                    style={styles.input}
                                                                />
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Add More Option Button */}
                                        <div style={{ marginTop: "14px" }}>
                                            <button
                                                type="button"
                                                onClick={handleAddCompany}
                                                style={styles.addCompanyBtnSecondary}
                                            >
                                                + Add More Option (Another Company Experience)
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </section>


                            {/* Submit Area */}
                            <div style={styles.submitArea}>
                                <p style={styles.requiredText}>
                                    <span style={styles.required}>*</span> Required fields
                                </p>

                                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                    {formData.resume && previewUrl && (
                                        <button
                                            type="button"
                                            onClick={() => setShowPreviewModal(true)}
                                            style={styles.secondaryButton}
                                        >
                                            👁 Preview Resume
                                        </button>
                                    )}

                                    <button
                                        type="submit"
                                        style={{
                                            ...styles.submitButton,
                                            opacity: loading ? 0.7 : 1,
                                            cursor: loading ? "not-allowed" : "pointer",
                                        }}
                                        disabled={loading}
                                    >
                                        {loading ? "Submitting Application..." : "Submit Application"}
                                        {!loading && <span style={styles.arrow}>→</span>}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </>
                )}

                {/* Footer */}
                <div style={styles.footer}>
                    <p>
                        Candidate records are securely stored in the Talentdesk PostgreSQL database and accessible only to authorized HR personnel.
                    </p>
                </div>
            </main>

            {/* Resume Preview Modal */}
            {showPreviewModal && previewUrl && (
                <div style={styles.modalOverlay} onClick={() => setShowPreviewModal(false)}>
                    <div style={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
                                    Resume Preview: {formData.resume?.name}
                                </h3>
                                <span style={{ fontSize: "12px", color: "#64748b" }}>
                                    Original document inspection
                                </span>
                            </div>
                            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                <button
                                    type="button"
                                    onClick={handleRescan}
                                    style={styles.rescanButton}
                                >
                                    ↺ Rescan
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowPreviewModal(false)}
                                    style={styles.modalCloseBtn}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div style={styles.modalContent}>
                            {formData.resume?.name?.toLowerCase()?.endsWith('.pdf') ? (
                                <iframe
                                    src={previewUrl}
                                    title="Resume Document Preview"
                                    style={{ width: "100%", height: "580px", border: "none", borderRadius: "6px" }}
                                />
                            ) : formData.resume?.type?.startsWith('image/') || /\.(jpe?g|png)$/i.test(formData.resume?.name || '') ? (
                                <div style={{ textAlign: "center", maxHeight: "580px", overflow: "auto", padding: "10px" }}>
                                    <img
                                        src={previewUrl}
                                        alt="Resume preview"
                                        style={{ maxWidth: "100%", maxHeight: "560px", objectFit: "contain", borderRadius: "6px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
                                    />
                                </div>
                            ) : (
                                <div style={{ padding: "40px 20px", textAlign: "center", color: "#475569" }}>
                                    <div style={{ fontSize: "40px", marginBottom: "12px" }}>📄</div>
                                    <h4 style={{ margin: "0 0 8px 0" }}>Document Ready for Registration</h4>
                                    <p style={{ margin: 0, fontSize: "14px" }}>
                                        {formData.resume?.name} is attached. Direct browser iframe preview is available for PDF and images.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ================================= */
/* REUSABLE FORM FIELD */
/* ================================= */
const FormField = ({ label, required, input, error, autoFilled }) => {
    return (
        <div style={styles.formGroup}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "7px" }}>
                <label style={{ ...styles.label, marginBottom: 0 }}>
                    {label}
                    {required && <span style={styles.required}> *</span>}
                </label>
                {autoFilled && <span style={styles.autoFilledBadge}>✨ Extracted</span>}
            </div>
            {input}
            {error && <div style={styles.fieldError}>{error}</div>}
        </div>
    );
};

/* ================================= */
/* STYLES */
/* ================================= */
const styles = {
    page: {
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#0f172a",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    header: {
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        position: "sticky",
        top: 0,
        zIndex: 20,
    },
    headerContent: {
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "16px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    brand: {
        fontSize: "19px",
        fontWeight: "800",
        letterSpacing: "-0.4px",
        color: "#0f172a",
    },
    brandSubtext: {
        marginTop: "2px",
        color: "#64748b",
        fontSize: "12px",
    },
    headerBadge: {
        fontSize: "12px",
        fontWeight: "600",
        color: "#334155",
        background: "#f1f5f9",
        padding: "6px 12px",
        borderRadius: "6px",
    },
    main: {
        width: "100%",
        maxWidth: "960px",
        margin: "0 auto",
        padding: "36px 24px 60px",
        boxSizing: "border-box",
    },
    pageHeading: {
        marginBottom: "24px",
    },
    title: {
        margin: 0,
        fontSize: "28px",
        fontWeight: "800",
        letterSpacing: "-0.6px",
        color: "#0f172a",
    },
    subtitle: {
        marginTop: "6px",
        marginBottom: 0,
        color: "#64748b",
        fontSize: "14px",
        lineHeight: "1.5",
    },
    // Scanner Card Styles
    scannerCard: {
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "22px",
        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
    },
    scannerHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "10px",
        paddingBottom: "16px",
        borderBottom: "1px solid #f1f5f9",
        marginBottom: "16px",
    },
    scannerBadge: {
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "13px",
        fontWeight: "700",
        color: "#1e3a8a",
        background: "#dbeafe",
        padding: "4px 10px",
        borderRadius: "6px",
    },
    formatPills: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        flexWrap: "wrap",
    },
    formatTag: {
        fontSize: "11px",
        fontWeight: "600",
        color: "#475569",
        background: "#f1f5f9",
        padding: "3px 7px",
        borderRadius: "4px",
    },
    scannerBody: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "20px",
    },
    scannerActions: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
    },
    scanButton: {
        background: "#2563eb",
        color: "#ffffff",
        border: "none",
        padding: "11px 18px",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: "700",
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
        transition: "all 0.15s ease",
    },
    rescanButton: {
        background: "#f8fafc",
        color: "#334155",
        border: "1px solid #cbd5e1",
        padding: "10px 14px",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
    },
    previewButton: {
        background: "#eff6ff",
        color: "#1d4ed8",
        border: "1px solid #bfdbfe",
        padding: "10px 14px",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
    },
    progressContainer: {
        marginTop: "16px",
        padding: "14px",
        background: "#f8fafc",
        borderRadius: "8px",
        border: "1px solid #e2e8f0",
    },
    progressBarTrack: {
        width: "100%",
        height: "8px",
        background: "#e2e8f0",
        borderRadius: "999px",
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        background: "linear-gradient(90deg, #2563eb, #3b82f6)",
        borderRadius: "999px",
        transition: "width 0.3s ease",
    },
    scanErrorBanner: {
        marginTop: "14px",
        padding: "12px 14px",
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: "8px",
        color: "#991b1b",
        fontSize: "13px",
        display: "flex",
        alignItems: "center",
    },
    scanSuccessBanner: {
        marginTop: "14px",
        padding: "12px 16px",
        background: "#f0fdf4",
        border: "1px solid #bbf7d0",
        borderRadius: "8px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "10px",
    },
    miniCheck: {
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        background: "#16a34a",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "13px",
        fontWeight: "700",
        flexShrink: 0,
    },
    duplicateWarningBox: {
        marginTop: "16px",
        padding: "14px 16px",
        background: "#fffbeb",
        border: "1px solid #fde68a",
        borderRadius: "8px",
    },
    duplicateList: {
        background: "#ffffff",
        border: "1px solid #fef3c7",
        borderRadius: "6px",
        padding: "8px 12px",
        marginTop: "6px",
    },
    duplicateItem: {
        fontSize: "12px",
        color: "#78350f",
        padding: "4px 0",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "6px",
    },
    stagePill: {
        fontSize: "10px",
        fontWeight: "700",
        padding: "2px 6px",
        borderRadius: "4px",
        background: "#fef3c7",
        color: "#92400e",
    },
    autoFilledBadge: {
        fontSize: "11px",
        fontWeight: "600",
        color: "#2563eb",
        background: "#eff6ff",
        padding: "2px 6px",
        borderRadius: "4px",
    },
    // Extracted Candidate Summary Card (Details collapsed by default)
    extractedSummaryCard: {
        background: "#ffffff",
        border: "1px solid #bbf7d0",
        borderRadius: "10px",
        padding: "18px 22px",
        marginBottom: "20px",
        boxShadow: "0 2px 8px rgba(34, 197, 94, 0.08)",
    },
    extractedSummaryHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "14px",
    },
    extractedAvatar: {
        width: "42px",
        height: "42px",
        borderRadius: "50%",
        background: "#e0f2fe",
        color: "#0369a1",
        fontSize: "18px",
        fontWeight: "800",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    extractedName: {
        fontSize: "16px",
        fontWeight: "700",
        color: "#0f172a",
    },
    extractedBadge: {
        fontSize: "11px",
        fontWeight: "700",
        color: "#166534",
        background: "#dcfce7",
        padding: "2px 8px",
        borderRadius: "12px",
    },
    extractedMeta: {
        display: "flex",
        gap: "14px",
        flexWrap: "wrap",
        fontSize: "13px",
        color: "#475569",
        marginTop: "4px",
    },
    smallPreviewBtn: {
        background: "#f1f5f9",
        border: "1px solid #cbd5e1",
        borderRadius: "6px",
        padding: "6px 12px",
        fontSize: "12px",
        fontWeight: "600",
        color: "#334155",
        cursor: "pointer",
    },
    toggleDetailsBtn: {
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: "6px",
        padding: "6px 12px",
        fontSize: "12px",
        fontWeight: "600",
        color: "#1d4ed8",
        cursor: "pointer",
    },
    collapsiblePersonalBox: {
        marginTop: "16px",
        paddingTop: "16px",
        borderTop: "1px solid #e2e8f0",
    },
    manualEntryBanner: {
        background: "#ffffff",
        border: "1px dashed #cbd5e1",
        borderRadius: "10px",
        padding: "16px 20px",
        marginBottom: "20px",
    },
    toggleManualBtn: {
        background: "#f8fafc",
        border: "1px solid #cbd5e1",
        borderRadius: "6px",
        padding: "6px 12px",
        fontSize: "12px",
        fontWeight: "600",
        color: "#0f172a",
        cursor: "pointer",
    },
    // Form Sections
    section: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "26px",
        marginBottom: "20px",
        boxShadow: "0 2px 6px rgba(15, 23, 42, 0.03)",
    },
    sectionHeader: {
        display: "flex",
        gap: "14px",
        alignItems: "flex-start",
        marginBottom: "22px",
    },
    sectionNumber: {
        minWidth: "32px",
        height: "32px",
        borderRadius: "6px",
        background: "#0f172a",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        fontWeight: "700",
    },
    sectionTitle: {
        margin: 0,
        fontSize: "17px",
        fontWeight: "700",
        color: "#0f172a",
    },
    sectionDescription: {
        margin: "4px 0 0",
        color: "#64748b",
        fontSize: "13px",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "18px",
    },
    formGroup: {
        minWidth: 0,
    },
    label: {
        display: "block",
        fontSize: "13px",
        fontWeight: "600",
        color: "#334155",
    },
    required: {
        color: "#dc2626",
    },
    fieldError: {
        marginTop: "5px",
        color: "#dc2626",
        fontSize: "12px",
        fontWeight: "500",
    },
    input: {
        width: "100%",
        boxSizing: "border-box",
        minHeight: "42px",
        padding: "9px 12px",
        border: "1px solid #cbd5e1",
        borderRadius: "6px",
        background: "#ffffff",
        color: "#0f172a",
        fontSize: "14px",
        outline: "none",
        transition: "border-color 0.15s ease",
    },
    // Company Experience Card & Dynamic Add More
    companyExperienceCard: {
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "18px",
    },
    companyCardHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "14px",
        paddingBottom: "10px",
        borderBottom: "1px solid #edf2f7",
    },
    companyBadgeNumber: {
        background: "#0f172a",
        color: "#ffffff",
        fontSize: "11px",
        fontWeight: "700",
        padding: "2px 7px",
        borderRadius: "4px",
    },
    removeCompanyBtn: {
        background: "#fee2e2",
        color: "#dc2626",
        border: "1px solid #fecaca",
        padding: "4px 10px",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: "600",
        cursor: "pointer",
    },
    addCompanyBtn: {
        background: "#eff6ff",
        color: "#2563eb",
        border: "1px dashed #93c5fd",
        padding: "8px 14px",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: "700",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
    },
    addCompanyBtnSecondary: {
        width: "100%",
        padding: "11px",
        background: "#f8fafc",
        color: "#2563eb",
        border: "1px dashed #93c5fd",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: "700",
        cursor: "pointer",
        textAlign: "center",
        transition: "background 0.15s ease",
    },
    fresherPillBox: {
        display: "flex",
        alignItems: "center",
        gap: "14px",
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: "8px",
        padding: "16px",
    },
    uploadBox: {
        display: "flex",
        alignItems: "center",
        gap: "16px",
        border: "1px dashed #cbd5e1",
        borderRadius: "8px",
        background: "#f8fafc",
        padding: "18px",
    },
    uploadIcon: {
        width: "42px",
        height: "42px",
        borderRadius: "8px",
        background: "#e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "20px",
        flexShrink: 0,
    },
    uploadContent: {
        flex: 1,
    },
    fileInput: {
        display: "block",
        width: "100%",
        fontSize: "13px",
        color: "#475569",
        marginTop: "6px",
    },
    helpText: {
        display: "block",
        marginTop: "5px",
        color: "#64748b",
        fontSize: "12px",
    },
    submitArea: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        marginTop: "24px",
        flexWrap: "wrap",
    },
    requiredText: {
        margin: 0,
        fontSize: "12px",
        color: "#64748b",
    },
    submitButton: {
        border: "none",
        background: "#0f172a",
        color: "#ffffff",
        padding: "12px 24px",
        borderRadius: "7px",
        fontSize: "14px",
        fontWeight: "700",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        transition: "all 0.2s ease",
    },
    secondaryButton: {
        border: "1px solid #cbd5e1",
        background: "#ffffff",
        color: "#334155",
        padding: "12px 18px",
        borderRadius: "7px",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
    },
    arrow: {
        fontSize: "16px",
    },
    // =========================================================
    // DEDICATED SUCCESS SCREEN STYLES (NO EMPTY FORM)
    // =========================================================
    successScreenCard: {
        background: "#ffffff",
        border: "1px solid #bbf7d0",
        borderRadius: "14px",
        padding: "40px 32px",
        textAlign: "center",
        boxShadow: "0 10px 25px -5px rgba(22, 163, 74, 0.1), 0 8px 10px -6px rgba(22, 163, 74, 0.05)",
        marginBottom: "30px",
    },
    successIconLarge: {
        width: "68px",
        height: "68px",
        borderRadius: "50%",
        background: "#16a34a",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "36px",
        fontWeight: "800",
        margin: "0 auto 20px auto",
        boxShadow: "0 8px 16px rgba(22, 163, 74, 0.3)",
    },
    successTitle: {
        margin: "0 0 10px 0",
        fontSize: "26px",
        fontWeight: "800",
        color: "#166534",
        letterSpacing: "-0.5px",
    },
    successSubtitle: {
        margin: "0 auto 28px auto",
        maxWidth: "600px",
        fontSize: "15px",
        color: "#475569",
        lineHeight: "1.6",
    },
    successSummaryBox: {
        maxWidth: "560px",
        margin: "0 auto 30px auto",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "20px 24px",
        textAlign: "left",
    },
    summaryRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid #edf2f7",
        fontSize: "14px",
    },
    summaryLabel: {
        color: "#64748b",
        fontWeight: "500",
    },
    summaryValue: {
        color: "#0f172a",
        fontWeight: "700",
    },
    companySummaryItem: {
        fontSize: "13px",
        color: "#334155",
    },
    summaryFilePill: {
        fontSize: "12px",
        fontWeight: "600",
        color: "#166534",
        background: "#dcfce7",
        padding: "3px 8px",
        borderRadius: "4px",
    },
    inboxStagePill: {
        fontSize: "12px",
        fontWeight: "700",
        color: "#1e3a8a",
        background: "#dbeafe",
        padding: "3px 8px",
        borderRadius: "4px",
    },
    successActions: {
        display: "flex",
        gap: "14px",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "wrap",
    },
    primaryActionButton: {
        background: "#16a34a",
        color: "#ffffff",
        border: "none",
        padding: "13px 26px",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: "700",
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(22, 163, 74, 0.25)",
        transition: "all 0.15s ease",
    },
    secondaryActionButton: {
        background: "#ffffff",
        color: "#334155",
        border: "1px solid #cbd5e1",
        padding: "12px 22px",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: "600",
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        cursor: "pointer",
    },
    footer: {
        textAlign: "center",
        marginTop: "30px",
        color: "#64748b",
        fontSize: "12px",
        lineHeight: "1.6",
    },
    // Modal Styles
    modalOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
    },
    modalContainer: {
        background: "#ffffff",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "850px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        overflow: "hidden",
    },
    modalHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 20px",
        borderBottom: "1px solid #e2e8f0",
        background: "#f8fafc",
    },
    modalCloseBtn: {
        border: "none",
        background: "#e2e8f0",
        color: "#475569",
        width: "32px",
        height: "32px",
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "16px",
        cursor: "pointer",
    },
    modalContent: {
        padding: "16px",
        maxHeight: "75vh",
        overflowY: "auto",
    },
};

export default CandidateRegistration;