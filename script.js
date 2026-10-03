"use strict";

/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
    "https://gcfetfjkoiubvlxiiocy.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_EOc6ej5uFfdsW3fsFkz9cw_RfNu9nlZ";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {
            db: {
                schema: "rx_master"
            },
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        }
    );


/* =========================================================
   STATE
========================================================= */

const AppState = {

    view: "dashboard",

    user: null,

    selectedSpecialtyId: null,

    selectedSystemId: null,

    expandedSpecialties: new Set(),

    expandedSystems: new Set(),

    theme:
        localStorage.getItem("rxmaster-theme")
        || "emerald",

    mode:
        localStorage.getItem("rxmaster-mode")
        || "dark"

};


/* =========================================================
   DOM
========================================================= */

const $ = selector =>
    document.querySelector(selector);

const $$ = selector =>
    [...document.querySelectorAll(selector)];


/* =========================================================
   THEMES
========================================================= */

const THEMES = {

    emerald: {
        name: "Emerald",
        color: "#18d6a3"
    },

    gold: {
        name: "Gold",
        color: "#e9bd55"
    },

    sky: {
        name: "Sky",
        color: "#51bdf5"
    },

    violet: {
        name: "Violet",
        color: "#a87cff"
    },

    rose: {
        name: "Rose",
        color: "#f078a8"
    },

    teal: {
        name: "Teal",
        color: "#23d4d0"
    }

};


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeApp
);


async function initializeApp() {

    applyAppearance();

    buildThemes();

    initializeNavigation();

    initializeSidebar();

    initializeSearch();

    initializeAuth();

    initializeDashboard();

    initializeManager();

    initializePrescription();

    initializeProfile();

    await checkSession();

}


/* =========================================================
   APPEARANCE
========================================================= */

function applyAppearance() {

    document.documentElement.dataset.theme =
        AppState.theme;

    document.documentElement.dataset.mode =
        AppState.mode;

    localStorage.setItem(
        "rxmaster-theme",
        AppState.theme
    );

    localStorage.setItem(
        "rxmaster-mode",
        AppState.mode
    );

}


function toggleAppearance() {

    AppState.mode =
        AppState.mode === "dark"
            ? "light"
            : "dark";

    applyAppearance();

}


function buildThemes() {

    const container =
        $("#themeGrid");

    if (!container) {
        return;
    }

    container.innerHTML =
        Object.entries(THEMES)
            .map(
                ([key, theme]) => `
                    <button
                        class="theme-card ${
                            AppState.theme === key
                                ? "active"
                                : ""
                        }"
                        type="button"
                        data-theme="${key}"
                    >
                        <div
                            class="theme-swatch"
                            style="
                                background:
                                linear-gradient(
                                    135deg,
                                    ${theme.color},
                                    ${theme.color}88
                                )
                            "
                        ></div>

                        <strong>
                            ${escapeHtml(theme.name)}
                        </strong>
                    </button>
                `
            )
            .join("");

    $$("[data-theme]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    AppState.theme =
                        button.dataset.theme;

                    applyAppearance();

                    buildThemes();

                }
            );

        });

}


/* =========================================================
   NAVIGATION
========================================================= */

const VIEW_LABELS = {

    dashboard: "Dashboard",

    "rx-library": "Rx Library",

    prescription: "Prescription Writer",

    "drug-library": "Drug Library",

    "investigation-library": "Investigations",

    favorites: "Favorites",

    recent: "Recently Viewed",

    "admin-manager": "Content Manager",

    appearance: "Appearance"

};


function initializeNavigation() {

    $$("[data-view]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const view =
                        button.dataset.view;

                    if (view) {
                        setView(view);
                    }

                }
            );

        });

}


async function setView(view) {

    if (
        view === "admin-manager" &&
        AppState.user?.role !== "admin"
    ) {
        return;
    }

    AppState.view = view;

    $$(".view")
        .forEach(element => {

            element.classList.toggle(
                "active",
                element.id === `${view}View`
            );

        });

    $$(".nav-item")
        .forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.view === view
            );

        });

    const breadcrumb =
        $("#breadcrumb");

    if (breadcrumb) {

        breadcrumb.textContent =
            VIEW_LABELS[view] || view;

    }

    closeSidebar();

    if (view === "rx-library") {
        await loadSpecialties();
    }

    if (view === "admin-manager") {
        await loadAdminTree();
    }

    if (view === "drug-library") {
        await loadDrugLibrary();
    }

    if (view === "investigation-library") {
        await loadInvestigationLibrary();
    }

    if (view === "favorites") {
        await loadFavorites();
    }

    if (view === "recent") {
        await loadRecent();
    }

    if (view === "dashboard") {
        await loadDashboardStats();
    }

}


/* =========================================================
   SIDEBAR
========================================================= */

function initializeSidebar() {

    $("#menuButton")?.addEventListener(
        "click",
        openSidebar
    );

    $("#mobileClose")?.addEventListener(
        "click",
        closeSidebar
    );

    $("#sidebarOverlay")?.addEventListener(
        "click",
        closeSidebar
    );

}


function openSidebar() {

    $("#sidebar")?.classList.add("open");

    $("#sidebarOverlay")?.classList.add("open");

}


function closeSidebar() {

    $("#sidebar")?.classList.remove("open");

    $("#sidebarOverlay")?.classList.remove("open");

}


/* =========================================================
   AUTH
========================================================= */

let selectedLoginRole = "user";


function initializeAuth() {

    $$("[data-login-role]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    selectedLoginRole =
                        button.dataset.loginRole;

                    $$("[data-login-role]")
                        .forEach(item =>
                            item.classList.toggle(
                                "active",
                                item === button
                            )
                        );

                }
            );

        });


    $("#loginForm")?.addEventListener(
        "submit",
        signIn
    );


    $("#logoutButton")?.addEventListener(
        "click",
        signOut
    );


    supabaseClient.auth.onAuthStateChange(
        async (event, session) => {

            if (
                session &&
                (
                    event === "SIGNED_IN" ||
                    event === "INITIAL_SESSION"
                )
            ) {

                await loadAuthenticatedUser(
                    session
                );

            }

            if (event === "SIGNED_OUT") {

                AppState.user = null;

                showAuth();

            }

        }
    );

}


async function checkSession() {

    const {
        data,
        error
    } =
        await supabaseClient.auth.getSession();

    if (error) {

        console.error(error);

        showAuth();

        return;

    }

    if (!data.session) {

        showAuth();

        return;

    }

    await loadAuthenticatedUser(
        data.session
    );

}


async function signIn(event) {

    event.preventDefault();

    const email =
        $("#loginEmail").value.trim();

    const password =
        $("#loginPassword").value;

    const button =
        $("#loginSubmit");

    setMessage(
        $("#authMessage"),
        "Signing in...",
        ""
    );

    button.disabled = true;

    const {
        data,
        error
    } =
        await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

    if (error) {

        button.disabled = false;

        setMessage(
            $("#authMessage"),
            authError(error),
            "error"
        );

        return;

    }

    if (!data.session) {

        button.disabled = false;

        setMessage(
            $("#authMessage"),
            "No active session was returned.",
            "error"
        );

        return;

    }

    await loadAuthenticatedUser(
        data.session
    );

    button.disabled = false;

}


async function loadAuthenticatedUser(session) {

    const {
        data: profile,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select(
                "id, display_name, role"
            )
            .eq(
                "id",
                session.user.id
            )
            .maybeSingle();

    if (error) {

        console.error(error);

        setMessage(
            $("#authMessage"),
            "Unable to load your Rx Master profile.",
            "error"
        );

        showAuth();

        return;

    }

    if (!profile) {

        setMessage(
            $("#authMessage"),
            "Your Rx Master profile was not found.",
            "error"
        );

        showAuth();

        return;

    }

    AppState.user = {

        id: profile.id,

        email:
            session.user.email || "",

        displayName:
            profile.display_name || "",

        role:
            profile.role

    };


    updateUserInterface();

    hideAuth();

    await loadDashboardStats();

}


function updateUserInterface() {

    const user =
        AppState.user;

    if (!user) {
        return;
    }

    const name =
        user.displayName ||
        user.email ||
        "User";

    $("#profileName").textContent =
        name;

    $("#profileRole").textContent =
        user.role === "admin"
            ? "Administrator"
            : "Clinical workspace";

    $("#avatar").textContent =
        name
            .charAt(0)
            .toUpperCase();


    const isAdmin =
        user.role === "admin";

    $("#adminNavLabel").hidden =
        !isAdmin;

    $("#adminManagerNav").hidden =
        !isAdmin;

    $("#adminDashboardPanel").hidden =
        !isAdmin;

}


async function signOut() {

    await supabaseClient.auth.signOut();

}


function hideAuth() {

    $("#authScreen")?.classList.add(
        "hidden"
    );

    $("#app").hidden = false;

}


function showAuth() {

    $("#authScreen")?.classList.remove(
        "hidden"
    );

    $("#app").hidden = true;

}


function authError(error) {

    const message =
        error?.message?.toLowerCase() || "";

    if (
        message.includes(
            "invalid login credentials"
        )
    ) {
        return "Incorrect email or password.";
    }

    if (
        message.includes(
            "email not confirmed"
        )
    ) {
        return "Please confirm your email first.";
    }

    return (
        error?.message ||
        "Unable to sign in."
    );

}


/* =========================================================
   DASHBOARD
========================================================= */

function initializeDashboard() {

    $("#dashboardSearch")?.addEventListener(
        "click",
        openSearch
    );

    $("#openManagerButton")?.addEventListener(
        "click",
        () => setView("admin-manager")
    );

    $("#appearanceButton")?.addEventListener(
        "click",
        toggleAppearance
    );

}


async function loadDashboardStats() {

    if (!AppState.user) {
        return;
    }

    const [
        diseases,
        drugs,
        investigations,
        favorites
    ] = await Promise.all([

        supabaseClient
            .from("diseases")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "is_published",
                true
            ),

        supabaseClient
            .from("drugs")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "is_active",
                true
            ),

        supabaseClient
            .from("investigations")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "is_active",
                true
            ),

        supabaseClient
            .from("favorites")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )

    ]);

    $("#statDiseases").textContent =
        diseases.count ?? "0";

    $("#statDrugs").textContent =
        drugs.count ?? "0";

    $("#statInvestigations").textContent =
        investigations.count ?? "0";

    $("#statFavorites").textContent =
        favorites.count ?? "0";

}


/* =========================================================
   ADMIN MANAGER
========================================================= */

function initializeManager() {

    $("#addSpecialtyButton")
        ?.addEventListener(
            "click",
            () => openSpecialtyModal()
        );


    $("#addSystemButton")
        ?.addEventListener(
            "click",
            () => {

                if (
                    AppState.selectedSpecialtyId
                ) {

                    openSystemModal(
                        AppState.selectedSpecialtyId
                    );

                }

            }
        );

}


async function loadAdminTree() {

    const container =
        $("#adminManagerContent");

    if (!container) {
        return;
    }

    if (AppState.user?.role !== "admin") {
        return;
    }

    container.innerHTML =
        loadingBox("Loading clinical structure...");


    const {
        data: specialties,
        error
    } =
        await supabaseClient
            .from("specialties")
            .select(
                "id,name,description,icon,sort_order,is_active"
            )
            .order(
                "sort_order",
                {
                    ascending: true
                }
            )
            .order(
                "name",
                {
                    ascending: true
                }
            );


    if (error) {

        container.innerHTML =
            errorBox(error.message);

        return;

    }


    if (!specialties?.length) {

        container.innerHTML =
            emptyBox(
                "No specialties yet.",
                "Create your first specialty to begin."
            );

        updateSystemButton();

        return;

    }


    container.innerHTML =
        specialties
            .map(
                specialty =>
                    renderSpecialtyTreeRow(
                        specialty
                    )
            )
            .join("");


    bindManagerEvents();

    updateSystemButton();

}


function renderSpecialtyTreeRow(
    specialty
) {

    const expanded =
        AppState.expandedSpecialties.has(
            specialty.id
        );

    return `

        <div
            class="tree-row"
            data-specialty="${specialty.id}"
        >

            <div class="tree-main">

                <button
                    class="tree-expand"
                    type="button"
                    data-expand-specialty="${specialty.id}"
                >
                    ${expanded ? "▾" : "▸"}
                </button>

                <div class="tree-icon">
                    ✚
                </div>

                <div class="tree-copy">

                    <strong>
                        ${escapeHtml(specialty.name)}
                    </strong>

                    <small>
                        ${escapeHtml(
                            specialty.description ||
                            "No description"
                        )}
                    </small>

                </div>

                <div class="tree-actions">

                    <button
                        class="icon-action"
                        type="button"
                        data-select-specialty="${specialty.id}"
                        title="Select specialty"
                    >
                        ✓
                    </button>

                    <button
                        class="icon-action"
                        type="button"
                        data-edit-specialty="${specialty.id}"
                        title="Edit"
                    >
                        ✎
                    </button>

                    <button
                        class="icon-action danger"
                        type="button"
                        data-delete-specialty="${specialty.id}"
                        title="Delete"
                    >
                        ×
                    </button>

                </div>

            </div>

            ${
                expanded
                    ? `
                        <div
                            class="tree-children"
                            data-specialty-children="${specialty.id}"
                        >
                            ${`
                                <div class="loading-box">
                                    Loading systems...
                                </div>
                            `}
                        </div>
                    `
                    : ""
            }

        </div>
    `;

}


function bindManagerEvents() {

    $$("[data-expand-specialty]")
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const id =
                        button.dataset.expandSpecialty;

                    if (
                        AppState.expandedSpecialties
                            .has(id)
                    ) {

                        AppState.expandedSpecialties
                            .delete(id);

                    } else {

                        AppState.expandedSpecialties
                            .add(id);

                    }

                    await loadAdminTree();

                    if (
                        AppState.expandedSpecialties
                            .has(id)
                    ) {

                        await loadSystemsForManager(
                            id
                        );

                    }

                }
            );

        });


    $$("[data-select-specialty]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    AppState.selectedSpecialtyId =
                        button.dataset.selectSpecialty;

                    AppState.selectedSystemId =
                        null;

                    updateSystemButton();

                    $$(".tree-row")
                        .forEach(row =>
                            row.classList.remove(
                                "selected"
                            )
                        );

                    button
                        .closest(".tree-row")
                        ?.classList.add(
                            "selected"
                        );

                }
            );

        });


    $$("[data-edit-specialty]")
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const {
                        data
                    } =
                        await supabaseClient
                            .from("specialties")
                            .select("*")
                            .eq(
                                "id",
                                button.dataset.editSpecialty
                            )
                            .maybeSingle();

                    if (data) {
                        openSpecialtyModal(data);
                    }

                }
            );

        });


    $$("[data-delete-specialty]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    deleteSpecialty(
                        button.dataset.deleteSpecialty
                    )
            );

        });

}


async function loadSystemsForManager(
    specialtyId
) {

    const container =
        document.querySelector(
            `[data-specialty-children="${specialtyId}"]`
        );

    if (!container) {
        return;
    }

    const {
        data,
        error
    } =
        await supabaseClient
            .from("systems")
            .select("*")
            .eq(
                "specialty_id",
                specialtyId
            )
            .order(
                "sort_order",
                {
                    ascending: true
                }
            )
            .order(
                "name",
                {
                    ascending: true
                }
            );


    if (error) {

        container.innerHTML =
            errorBox(error.message);

        return;

    }


    if (!data?.length) {

        container.innerHTML = `

            <div class="empty-box">

                <strong>No systems yet.</strong>

                <span>
                    Select this specialty and click
                    Add System.
                </span>

            </div>

        `;

        return;

    }


    container.innerHTML =
        data
            .map(
                system => `

                    <div class="tree-child">

                        <div class="tree-icon">
                            ◈
                        </div>

                        <div class="tree-child-name">

                            <strong>
                                ${escapeHtml(system.name)}
                            </strong>

                            <small>
                                ${escapeHtml(
                                    system.description ||
                                    "No description"
                                )}
                            </small>

                        </div>

                        <button
                            class="icon-action"
                            type="button"
                            data-expand-system="${system.id}"
                        >
                            +
                        </button>

                        <button
                            class="icon-action"
                            type="button"
                            data-edit-system="${system.id}"
                        >
                            ✎
                        </button>

                        <button
                            class="icon-action danger"
                            type="button"
                            data-delete-system="${system.id}"
                        >
                            ×
                        </button>

                    </div>

                `
            )
            .join("");


    container
        .querySelectorAll(
            "[data-expand-system]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    loadManagerDiseases(
                        button.dataset.expandSystem
                    )
            );

        });


    container
        .querySelectorAll(
            "[data-edit-system]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const {
                        data
                    } =
                        await supabaseClient
                            .from("systems")
                            .select("*")
                            .eq(
                                "id",
                                button.dataset.editSystem
                            )
                            .maybeSingle();

                    if (data) {
                        openSystemModal(
                            data.specialty_id,
                            data
                        );
                    }

                }
            );

        });


    container
        .querySelectorAll(
            "[data-delete-system]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    deleteSystem(
                        button.dataset.deleteSystem
                    )
            );

        });

}


async function loadManagerDiseases(
    systemId
) {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("diseases")
            .select("*")
            .eq(
                "system_id",
                systemId
            )
            .order(
                "sort_order",
                {
                    ascending: true
                }
            )
            .order(
                "name",
                {
                    ascending: true
                }
            );


    const systemElement =
        document.querySelector(
            `[data-expand-system="${systemId}"]`
        );

    if (!systemElement) {
        return;
    }


    let holder =
        document.querySelector(
            `[data-disease-holder="${systemId}"]`
        );


    if (!holder) {

        holder =
            document.createElement("div");

        holder.dataset.diseaseHolder =
            systemId;

        holder.className =
            "tree-children";

        systemElement
            .closest(".tree-child")
            ?.after(holder);

    }


    if (error) {

        holder.innerHTML =
            errorBox(error.message);

        return;

    }


    if (!data?.length) {

        holder.innerHTML = `

            <div class="empty-box">

                <strong>No diseases yet.</strong>

                <span>
                    Add the first disease to this system.
                </span>

                <br>

                <button
                    class="secondary-button"
                    type="button"
                    data-add-disease="${systemId}"
                >
                    + Add Disease
                </button>

            </div>

        `;

    } else {

        holder.innerHTML = `

            ${data.map(
                disease => `

                    <div class="tree-child">

                        <div class="tree-icon">
                            ✚
                        </div>

                        <div class="tree-child-name">

                            <strong>
                                ${escapeHtml(
                                    disease.name
                                )}
                            </strong>

                            <small>
                                ${
                                    disease.is_published
                                        ? "Published"
                                        : "Draft"
                                }
                            </small>

                        </div>

                        <button
                            class="icon-action"
                            type="button"
                            data-edit-disease="${disease.id}"
                        >
                            ✎
                        </button>

                        <button
                            class="icon-action danger"
                            type="button"
                            data-delete-disease="${disease.id}"
                        >
                            ×
                        </button>

                    </div>

                `
            ).join("")}

            <button
                class="secondary-button"
                type="button"
                data-add-disease="${systemId}"
            >
                + Add Disease
            </button>

        `;

    }


    holder
        .querySelectorAll(
            "[data-add-disease]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    openDiseaseModal(
                        button.dataset.addDisease
                    )
            );

        });


    holder
        .querySelectorAll(
            "[data-edit-disease]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const {
                        data
                    } =
                        await supabaseClient
                            .from("diseases")
                            .select("*")
                            .eq(
                                "id",
                                button.dataset.editDisease
                            )
                            .maybeSingle();

                    if (data) {
                        openDiseaseModal(
                            data.system_id,
                            data
                        );
                    }

                }
            );

        });


    holder
        .querySelectorAll(
            "[data-delete-disease]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    deleteDisease(
                        button.dataset.deleteDisease
                    )
            );

        });

}


function updateSystemButton() {

    const button =
        $("#addSystemButton");

    if (!button) {
        return;
    }

    button.disabled =
        !AppState.selectedSpecialtyId;

}


/* =========================================================
   SPECIALTY MODAL
========================================================= */

function openSpecialtyModal(
    specialty = null
) {

    openModal({

        title:
            specialty
                ? "Edit Specialty"
                : "Create Specialty",

        eyebrow:
            specialty
                ? "EDIT SPECIALTY"
                : "NEW SPECIALTY",

        body: `

            <label class="field">
                <span>Name</span>
                <input
                    id="modalName"
                    maxlength="100"
                    value="${escapeAttr(
                        specialty?.name || ""
                    )}"
                    placeholder="e.g. Medicine"
                    required
                >
            </label>

            <label class="field">
                <span>Description</span>
                <textarea
                    id="modalDescription"
                    rows="4"
                    maxlength="500"
                    placeholder="Short description"
                >${escapeHtml(
                    specialty?.description || ""
                )}</textarea>
            </label>

            <label class="field">
                <span>Icon</span>
                <input
                    id="modalIcon"
                    maxlength="50"
                    value="${escapeAttr(
                        specialty?.icon ||
                        "stethoscope"
                    )}"
                    placeholder="stethoscope"
                >
            </label>

        `,

        submit:
            specialty
                ? "Save Changes"
                : "Create Specialty",

        onSubmit:
            () =>
                saveSpecialty(
                    specialty?.id || null
                )

    });

}


async function saveSpecialty(
    id
) {

    const name =
        $("#modalName").value.trim();

    const description =
        $("#modalDescription").value.trim();

    const icon =
        $("#modalIcon").value.trim()
        || "stethoscope";


    if (!name) {
        return;
    }


    const payload = {
        name,
        description,
        icon
    };


    const result =
        id
            ? await supabaseClient
                .from("specialties")
                .update(payload)
                .eq("id", id)

            : await supabaseClient
                .from("specialties")
                .insert(payload);


    if (result.error) {

        alert(result.error.message);

        return;

    }


    closeModal();

    await loadAdminTree();

}


/* =========================================================
   SYSTEM MODAL
========================================================= */

function openSystemModal(
    specialtyId,
    system = null
) {

    openModal({

        title:
            system
                ? "Edit System"
                : "Create System",

        eyebrow:
            system
                ? "EDIT SYSTEM"
                : "NEW SYSTEM",

        body: `

            <label class="field">
                <span>System Name</span>

                <input
                    id="modalName"
                    maxlength="100"
                    required
                    value="${escapeAttr(
                        system?.name || ""
                    )}"
                    placeholder="e.g. Cardiovascular System"
                >
            </label>

            <label class="field">
                <span>Description</span>

                <textarea
                    id="modalDescription"
                    rows="4"
                    maxlength="500"
                    placeholder="Short description"
                >${escapeHtml(
                    system?.description || ""
                )}</textarea>
            </label>

            <label class="field">
                <span>Icon</span>

                <input
                    id="modalIcon"
                    maxlength="50"
                    value="${escapeAttr(
                        system?.icon || "folder"
                    )}"
                    placeholder="folder"
                >
            </label>

        `,

        submit:
            system
                ? "Save Changes"
                : "Create System",

        onSubmit:
            () =>
                saveSystem(
                    specialtyId,
                    system?.id || null
                )

    });

}


async function saveSystem(
    specialtyId,
    id
) {

    const name =
        $("#modalName").value.trim();

    const description =
        $("#modalDescription").value.trim();

    const icon =
        $("#modalIcon").value.trim()
        || "folder";


    if (!name) {
        return;
    }


    const payload = {

        specialty_id:
            specialtyId,

        name,

        description,

        icon

    };


    const result =
        id
            ? await supabaseClient
                .from("systems")
                .update(payload)
                .eq("id", id)

            : await supabaseClient
                .from("systems")
                .insert(payload);


    if (result.error) {

        alert(result.error.message);

        return;

    }


    closeModal();

    await loadAdminTree();

}


/* =========================================================
   DISEASE MODAL
========================================================= */

function openDiseaseModal(
    systemId,
    disease = null
) {

    openModal({

        title:
            disease
                ? "Edit Disease"
                : "Create Disease",

        eyebrow:
            disease
                ? "EDIT DISEASE"
                : "NEW DISEASE",

        body: `

            <label class="field">
                <span>Disease Name</span>

                <input
                    id="modalName"
                    maxlength="150"
                    required
                    value="${escapeAttr(
                        disease?.name || ""
                    )}"
                    placeholder="Disease name"
                >
            </label>

            <label class="field">
                <span>Slug</span>

                <input
                    id="modalSlug"
                    maxlength="180"
                    value="${escapeAttr(
                        disease?.slug || ""
                    )}"
                    placeholder="auto-generated-slug"
                >
            </label>

            <label class="field">
                <span>Brief Discussion</span>

                <textarea
                    id="modalDescription"
                    rows="6"
                    maxlength="3000"
                    placeholder="Clinical overview"
                >${escapeHtml(
                    disease?.short_description || ""
                )}</textarea>
            </label>

            <label class="field">

                <span>Publication</span>

                <select id="modalPublished">

                    <option
                        value="false"
                        ${
                            disease?.is_published
                                ? ""
                                : "selected"
                        }
                    >
                        Draft
                    </option>

                    <option
                        value="true"
                        ${
                            disease?.is_published
                                ? "selected"
                                : ""
                        }
                    >
                        Published
                    </option>

                </select>

            </label>

        `,

        submit:
            disease
                ? "Save Disease"
                : "Create Disease",

        onSubmit:
            () =>
                saveDisease(
                    systemId,
                    disease?.id || null
                )

    });


    $("#modalName")
        ?.addEventListener(
            "input",
            () => {

                const slug =
                    $("#modalSlug");

                if (
                    slug &&
                    !disease
                ) {

                    slug.value =
                        slugify(
                            $("#modalName").value
                        );

                }

            }
        );

}


async function saveDisease(
    systemId,
    id
) {

    const name =
        $("#modalName").value.trim();

    const slug =
        slugify(
            $("#modalSlug").value.trim()
            || name
        );

    const shortDescription =
        $("#modalDescription")
            .value
            .trim();

    const isPublished =
        $("#modalPublished").value ===
        "true";


    if (!name || !slug) {
        return;
    }


    const payload = {

        system_id:
            systemId,

        name,

        slug,

        short_description:
            shortDescription,

        is_published:
            isPublished

    };


    const result =
        id
            ? await supabaseClient
                .from("diseases")
                .update(payload)
                .eq("id", id)

            : await supabaseClient
                .from("diseases")
                .insert(payload);


    if (result.error) {

        alert(result.error.message);

        return;

    }


    closeModal();

    await loadAdminTree();

}


/* =========================================================
   DELETE
========================================================= */

async function deleteSpecialty(id) {

    if (
        !confirm(
            "Delete this specialty?\n\n" +
            "Its systems and diseases are related " +
            "to this specialty."
        )
    ) {
        return;
    }

    const {
        error
    } =
        await supabaseClient
            .from("specialties")
            .delete()
            .eq("id", id);

    if (error) {

        alert(error.message);

        return;

    }

    if (
        AppState.selectedSpecialtyId === id
    ) {

        AppState.selectedSpecialtyId =
            null;

    }

    await loadAdminTree();

}


async function deleteSystem(id) {

    if (
        !confirm(
            "Delete this system?"
        )
    ) {
        return;
    }

    const {
        error
    } =
        await supabaseClient
            .from("systems")
            .delete()
            .eq("id", id);

    if (error) {

        alert(error.message);

        return;

    }

    await loadAdminTree();

}


async function deleteDisease(id) {

    if (
        !confirm(
            "Delete this disease and its clinical content?"
        )
    ) {
        return;
    }

    const {
        error
    } =
        await supabaseClient
            .from("diseases")
            .delete()
            .eq("id", id);

    if (error) {

        alert(error.message);

        return;

    }

    await loadAdminTree();

}


/* =========================================================
   RX LIBRARY
========================================================= */

async function loadSpecialties() {

    const container =
        $("#libraryContent");

    container.innerHTML =
        loadingBox(
            "Loading specialties..."
        );


    const {
        data,
        error
    } =
        await supabaseClient
            .from("specialties")
            .select(
                "id,name,description,icon"
            )
            .eq(
                "is_active",
                true
            )
            .order(
                "sort_order"
            )
            .order(
                "name"
            );


    if (error) {

        container.innerHTML =
            errorBox(error.message);

        return;

    }


    if (!data?.length) {

        container.innerHTML =
            emptyBox(
                "No specialties yet.",
                "Your clinical library is ready for content."
            );

        return;

    }


    container.innerHTML =
        data
            .map(
                specialty => `

                    <button
                        class="library-card"
                        type="button"
                        data-library-specialty="${specialty.id}"
                    >

                        <span class="library-card-icon">
                            ✚
                        </span>

                        <strong>
                            ${escapeHtml(
                                specialty.name
                            )}
                        </strong>

                        <small>
                            ${escapeHtml(
                                specialty.description ||
                                "Clinical specialty"
                            )}
                        </small>

                    </button>

                `
            )
            .join("");


    $$("[data-library-specialty]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    loadLibrarySystems(
                        button.dataset.librarySpecialty
                    )
            );

        });

}


async function loadLibrarySystems(
    specialtyId
) {

    const container =
        $("#libraryContent");

    container.innerHTML =
        loadingBox(
            "Loading systems..."
        );


    const [
        specialtyResult,
        systemsResult
    ] = await Promise.all([

        supabaseClient
            .from("specialties")
            .select(
                "id,name,description"
            )
            .eq(
                "id",
                specialtyId
            )
            .maybeSingle(),

        supabaseClient
            .from("systems")
            .select(
                "id,name,description,icon"
            )
            .eq(
                "specialty_id",
                specialtyId
            )
            .eq(
                "is_active",
                true
            )
            .order(
                "sort_order"
            )
            .order(
                "name"
            )

    ]);


    if (
        specialtyResult.error ||
        systemsResult.error
    ) {

        container.innerHTML =
            errorBox(
                (
                    specialtyResult.error ||
                    systemsResult.error
                ).message
            );

        return;

    }


    const specialty =
        specialtyResult.data;

    const systems =
        systemsResult.data || [];


    container.innerHTML = `

        <button
            class="secondary-button library-back"
            id="libraryBack"
            type="button"
        >
            ← Back to Specialties
        </button>

        <div class="page-heading">
            <div>
                <span class="eyebrow">
                    SPECIALTY
                </span>

                <h1>
                    ${escapeHtml(
                        specialty?.name || ""
                    )}
                </h1>

                <p>
                    ${escapeHtml(
                        specialty?.description || ""
                    )}
                </p>
            </div>
        </div>

        <div class="card-grid">

            ${
                systems.length
                    ? systems.map(
                        system => `

                            <button
                                class="library-card"
                                type="button"
                                data-library-system="${system.id}"
                            >

                                <span class="library-card-icon">
                                    ◈
                                </span>

                                <strong>
                                    ${escapeHtml(
                                        system.name
                                    )}
                                </strong>

                                <small>
                                    ${escapeHtml(
                                        system.description ||
                                        ""
                                    )}
                                </small>

                            </button>

                        `
                    ).join("")
                    : emptyBox(
                        "No systems yet.",
                        "This specialty has no published systems."
                    )
            }

        </div>

    `;


    $("#libraryBack")
        ?.addEventListener(
            "click",
            loadSpecialties
        );


    $$("[data-library-system]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    loadLibraryDiseases(
                        button.dataset.librarySystem
                    )
            );

        });

}


async function loadLibraryDiseases(
    systemId
) {

    const container =
        $("#libraryContent");

    container.innerHTML =
        loadingBox(
            "Loading diseases..."
        );


    const [
        systemResult,
        diseasesResult
    ] = await Promise.all([

        supabaseClient
            .from("systems")
            .select(
                "id,name,description,specialty_id"
            )
            .eq(
                "id",
                systemId
            )
            .maybeSingle(),

        supabaseClient
            .from("diseases")
            .select(
                "id,name,short_description,slug"
            )
            .eq(
                "system_id",
                systemId
            )
            .eq(
                "is_published",
                true
            )
            .order(
                "sort_order"
            )
            .order(
                "name"
            )

    ]);


    if (
        systemResult.error ||
        diseasesResult.error
    ) {

        container.innerHTML =
            errorBox(
                (
                    systemResult.error ||
                    diseasesResult.error
                ).message
            );

        return;

    }


    const system =
        systemResult.data;

    const diseases =
        diseasesResult.data || [];


    container.innerHTML = `

        <button
            class="secondary-button library-back"
            id="libraryBack"
            type="button"
        >
            ← Back to Systems
        </button>

        <div class="page-heading">

            <div>
                <span class="eyebrow">
                    SYSTEM
                </span>

                <h1>
                    ${escapeHtml(
                        system?.name || ""
                    )}
                </h1>

                <p>
                    ${escapeHtml(
                        system?.description || ""
                    )}
                </p>
            </div>

        </div>

        <div class="card-grid">

            ${
                diseases.length
                    ? diseases.map(
                        disease => `

                            <button
                                class="library-card"
                                type="button"
                                data-library-disease="${disease.id}"
                            >

                                <span class="library-card-icon">
                                    ✚
                                </span>

                                <strong>
                                    ${escapeHtml(
                                        disease.name
                                    )}
                                </strong>

                                <small>
                                    ${escapeHtml(
                                        disease.short_description ||
                                        "Clinical reference"
                                    )}
                                </small>

                            </button>

                        `
                    ).join("")
                    : emptyBox(
                        "No published diseases.",
                        "Published diseases will appear here."
                    )
            }

        </div>

    `;


    $("#libraryBack")
        ?.addEventListener(
            "click",
            () =>
                loadLibrarySystems(
                    system.specialty_id
                )
        );


    $$("[data-library-disease]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    openDiseaseReader(
                        button.dataset.libraryDisease
                    )
            );

        });

}


/* =========================================================
   DISEASE READER
========================================================= */

async function openDiseaseReader(
    diseaseId
) {

    const container =
        $("#libraryContent");

    container.innerHTML =
        loadingBox(
            "Loading clinical reference..."
        );


    const [
        diseaseResult,
        featuresResult,
        investigationsResult,
        treatmentResult,
        adviceResult,
        followupsResult
    ] = await Promise.all([

        supabaseClient
            .from("diseases")
            .select(
                "id,name,short_description,system_id"
            )
            .eq(
                "id",
                diseaseId
            )
            .maybeSingle(),

        supabaseClient
            .from("clinical_features")
            .select(
                "id,feature,sort_order"
            )
            .eq(
                "disease_id",
                diseaseId
            )
            .order(
                "sort_order"
            ),

        supabaseClient
            .from("disease_investigations")
            .select(`
                id,
                sort_order,
                investigations (
                    id,
                    name,
                    description
                )
            `)
            .eq(
                "disease_id",
                diseaseId
            )
            .order(
                "sort_order"
            ),

        supabaseClient
            .from("disease_treatments")
            .select(`
                id,
                title,
                notes,
                sort_order,
                treatment_items (
                    id,
                    dose,
                    route,
                    frequency,
                    duration,
                    instructions,
                    drugs (
                        id,
                        name,
                        generic_name
                    )
                )
            `)
            .eq(
                "disease_id",
                diseaseId
            )
            .order(
                "sort_order"
            ),

        supabaseClient
            .from("advice")
            .select(
                "id,advice,sort_order"
            )
            .eq(
                "disease_id",
                diseaseId
            )
            .order(
                "sort_order"
            ),

        supabaseClient
            .from("followups")
            .select(
                "id,followup,sort_order"
            )
            .eq(
                "disease_id",
                diseaseId
            )
            .order(
                "sort_order"
            )

    ]);


    const failed =
        [
            diseaseResult,
            featuresResult,
            investigationsResult,
            treatmentResult,
            adviceResult,
            followupsResult
        ]
            .find(
                result => result.error
            );


    if (
        failed ||
        !diseaseResult.data
    ) {

        container.innerHTML =
            errorBox(
                failed?.error?.message ||
                "Disease could not be loaded."
            );

        return;

    }


    const disease =
        diseaseResult.data;

    const features =
        featuresResult.data || [];

    const investigations =
        investigationsResult.data || [];

    const treatments =
        treatmentResult.data || [];

    const advice =
        adviceResult.data || [];

    const followups =
        followupsResult.data || [];


    container.innerHTML = `

        <div class="reader">

            <button
                class="secondary-button library-back"
                id="readerBack"
                type="button"
            >
                ← Back to Diseases
            </button>

            <header class="reader-header">

                <span class="eyebrow">
                    CLINICAL REFERENCE
                </span>

                <h1>
                    ${escapeHtml(
                        disease.name
                    )}
                </h1>

                <p>
                    ${escapeHtml(
                        disease.short_description ||
                        "Clinical reference"
                    )}
                </p>

                <div class="reader-actions">

                    <button
                        class="secondary-button"
                        id="favoriteDiseaseButton"
                        type="button"
                    >
                        ☆ Favorite
                    </button>

                    <button
                        class="secondary-button"
                        id="printDiseaseButton"
                        type="button"
                    >
                        Print
                    </button>

                </div>

            </header>


            <section class="reader-section">

                <h2>
                    Brief Discussion
                </h2>

                <p>
                    ${escapeHtml(
                        disease.short_description ||
                        "No discussion has been added yet."
                    )}
                </p>

            </section>


            <section class="reader-section">

                <h2>
                    Clinical Features
                </h2>

                ${
                    features.length
                        ? `
                            <ul class="reader-list">
                                ${
                                    features.map(
                                        item =>
                                            `<li>${escapeHtml(item.feature)}</li>`
                                    ).join("")
                                }
                            </ul>
                        `
                        : "<p>No clinical features added.</p>"
                }

            </section>


            <section class="reader-section">

                <h2>
                    Investigations
                </h2>

                ${
                    investigations.length
                        ? `
                            <ul class="reader-list">
                                ${
                                    investigations.map(
                                        item =>
                                            `<li>
                                                <strong>
                                                    ${escapeHtml(
                                                        item.investigations?.name ||
                                                        ""
                                                    )}
                                                </strong>
                                                ${
                                                    item.investigations?.description
                                                        ? ` — ${escapeHtml(item.investigations.description)}`
                                                        : ""
                                                }
                                            </li>`
                                    ).join("")
                                }
                            </ul>
                        `
                        : "<p>No investigations added.</p>"
                }

            </section>


            <section class="reader-section">

                <h2>
                    Treatment
                </h2>

                ${
                    treatments.length
                        ? treatments.map(
                            treatment => `

                                <div class="treatment-block">

                                    <strong>
                                        ${escapeHtml(
                                            treatment.title ||
                                            "Treatment"
                                        )}
                                    </strong>

                                    ${
                                        treatment.notes
                                            ? `
                                                <small>
                                                    ${escapeHtml(
                                                        treatment.notes
                                                    )}
                                                </small>
                                            `
                                            : ""
                                    }

                                    ${
                                        treatment.treatment_items?.length
                                            ? `
                                                <ul class="reader-list">
                                                    ${
                                                        treatment.treatment_items.map(
                                                            item =>
                                                                `<li>
                                                                    ${escapeHtml(
                                                                        item.drugs?.name ||
                                                                        item.drugs?.generic_name ||
                                                                        "Medication"
                                                                    )}
                                                                    ${
                                                                        item.dose
                                                                            ? ` — ${escapeHtml(item.dose)}`
                                                                            : ""
                                                                    }
                                                                    ${
                                                                        item.route
                                                                            ? `, ${escapeHtml(item.route)}`
                                                                            : ""
                                                                    }
                                                                    ${
                                                                        item.frequency
                                                                            ? `, ${escapeHtml(item.frequency)}`
                                                                            : ""
                                                                    }
                                                                    ${
                                                                        item.duration
                                                                            ? `, ${escapeHtml(item.duration)}`
                                                                            : ""
                                                                    }
                                                                </li>`
                                                        ).join("")
                                                    }
                                                </ul>
                                            `
                                            : ""
                                    }

                                </div>

                            `
                        ).join("")
                        : "<p>No treatment content added.</p>"
                }

            </section>


            <section class="reader-section">

                <h2>
                    Advice
                </h2>

                ${
                    advice.length
                        ? `
                            <ul class="reader-list">
                                ${
                                    advice.map(
                                        item =>
                                            `<li>${escapeHtml(item.advice)}</li>`
                                    ).join("")
                                }
                            </ul>
                        `
                        : "<p>No advice added.</p>"
                }

            </section>


            <section class="reader-section">

                <h2>
                    Follow-up
                </h2>

                ${
                    followups.length
                        ? `
                            <ul class="reader-list">
                                ${
                                    followups.map(
                                        item =>
                                            `<li>${escapeHtml(item.followup)}</li>`
                                    ).join("")
                                }
                            </ul>
                        `
                        : "<p>No follow-up content added.</p>"
                }

            </section>

        </div>

    `;


    $("#readerBack")
        ?.addEventListener(
            "click",
            () =>
                loadLibraryDiseases(
                    disease.system_id
                )
        );


    $("#printDiseaseButton")
        ?.addEventListener(
            "click",
            () => window.print()
        );


    $("#favoriteDiseaseButton")
        ?.addEventListener(
            "click",
            () =>
                toggleFavorite(
                    "disease",
                    disease.id
                )
        );


    await recordRecent(
        "disease",
        disease.id
    );

}


/* =========================================================
   FAVORITES
========================================================= */

async function toggleFavorite(
    type,
    id
) {

    if (!AppState.user) {
        return;
    }


    const column =
        `${type}_id`;


    const {
        data: existing,
        error: findError
    } =
        await supabaseClient
            .from("favorites")
            .select("id")
            .eq(
                "user_id",
                AppState.user.id
            )
            .eq(
                column,
                id
            )
            .maybeSingle();


    if (findError) {

        console.error(findError);

        return;

    }


    if (existing) {

        await supabaseClient
            .from("favorites")
            .delete()
            .eq(
                "id",
                existing.id
            );

    } else {

        await supabaseClient
            .from("favorites")
            .insert({
                user_id:
                    AppState.user.id,

                [column]:
                    id

            });

    }

}


async function loadFavorites() {

    const container =
        $("#favoritesContent");

    container.innerHTML =
        loadingBox("Loading favorites...");


    const {
        data,
        error
    } =
        await supabaseClient
            .from("favorites")
            .select(`
                id,
                disease_id,
                drug_id,
                investigation_id,
                diseases (
                    id,
                    name,
                    short_description
                ),
                drugs (
                    id,
                    name,
                    generic_name
                ),
                investigations (
                    id,
                    name,
                    description
                )
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        container.innerHTML =
            errorBox(error.message);

        return;

    }


    if (!data?.length) {

        container.innerHTML =
            emptyBox(
                "No favorites yet.",
                "Save diseases, drugs or investigations here."
            );

        return;

    }


    container.innerHTML =
        data.map(
            favorite => {

                const item =
                    favorite.diseases ||
                    favorite.drugs ||
                    favorite.investigations;

                if (!item) {
                    return "";
                }

                return `

                    <button
                        class="item-card"
                        type="button"
                    >

                        <strong>
                            ${escapeHtml(
                                item.name ||
                                item.generic_name ||
                                ""
                            )}
                        </strong>

                        <small>
                            ${escapeHtml(
                                item.short_description ||
                                item.description ||
                                item.generic_name ||
                                "Saved item"
                            )}
                        </small>

                    </button>

                `;

            }
        ).join("");

}


/* =========================================================
   RECENT
========================================================= */

async function recordRecent(
    type,
    id
) {

    if (!AppState.user) {
        return;
    }

    const column =
        `${type}_id`;

    const payload = {

        user_id:
            AppState.user.id,

        [column]:
            id,

        viewed_at:
            new Date().toISOString()

    };


    const result =
        await supabaseClient
            .from("recent_views")
            .upsert(
                payload,
                {
                    onConflict:
                        `user_id,${column}`
                }
            );


    if (result.error) {
        console.warn(
            "Recent view could not be recorded:",
            result.error
        );
    }

}


async function loadRecent() {

    const container =
        $("#recentContent");

    container.innerHTML =
        loadingBox(
            "Loading recent items..."
        );


    const {
        data,
        error
    } =
        await supabaseClient
            .from("recent_views")
            .select(`
                id,
                viewed_at,
                disease_id,
                diseases (
                    id,
                    name,
                    short_description
                )
            `)
            .order(
                "viewed_at",
                {
                    ascending: false
                }
            )
            .limit(30);


    if (error) {

        container.innerHTML =
            errorBox(error.message);

        return;

    }


    const items =
        (data || [])
            .filter(
                item => item.diseases
            );


    if (!items.length) {

        container.innerHTML =
            emptyBox(
                "No recent items.",
                "Diseases you open will appear here."
            );

        return;

    }


    container.innerHTML =
        items.map(
            item => `

                <button
                    class="item-card"
                    type="button"
                    data-recent-disease="${item.disease_id}"
                >

                    <strong>
                        ${escapeHtml(
                            item.diseases.name
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(
                            item.diseases.short_description ||
                            "Clinical reference"
                        )}
                    </small>

                </button>

            `
        ).join("");


    $$("[data-recent-disease]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    openDiseaseReader(
                        button.dataset.recentDisease
                    )
            );

        });

}


/* =========================================================
   DRUG LIBRARY
========================================================= */

async function loadDrugLibrary() {

    const container =
        $("#drugLibraryContent");

    container.innerHTML =
        loadingBox(
            "Loading drugs..."
        );


    const {
        data,
        error
    } =
        await supabaseClient
            .from("drugs")
            .select(
                "id,name,generic_name,description"
            )
            .eq(
                "is_active",
                true
            )
            .order(
                "name"
            );


    if (error) {

        container.innerHTML =
            errorBox(error.message);

        return;

    }


    if (!data?.length) {

        container.innerHTML =
            emptyBox(
                "No drugs available.",
                "The medication library is ready for content."
            );

        return;

    }


    container.innerHTML =
        data.map(
            drug => `

                <article class="item-card">

                    <strong>
                        ${escapeHtml(drug.name)}
                    </strong>

                    <small>
                        ${escapeHtml(
                            drug.generic_name ||
                            drug.description ||
                            ""
                        )}
                    </small>

                </article>

            `
        ).join("");

}


/* =========================================================
   INVESTIGATION LIBRARY
========================================================= */

async function loadInvestigationLibrary() {

    const container =
        $("#investigationLibraryContent");

    container.innerHTML =
        loadingBox(
            "Loading investigations..."
        );


    const {
        data,
        error
    } =
        await supabaseClient
            .from("investigations")
            .select(
                "id,name,description"
            )
            .eq(
                "is_active",
                true
            )
            .order(
                "name"
            );


    if (error) {

        container.innerHTML =
            errorBox(error.message);

        return;

    }


    if (!data?.length) {

        container.innerHTML =
            emptyBox(
                "No investigations available.",
                "The investigation library is ready for content."
            );

        return;

    }


    container.innerHTML =
        data.map(
            item => `

                <article class="item-card">

                    <strong>
                        ${escapeHtml(item.name)}
                    </strong>

                    <small>
                        ${escapeHtml(
                            item.description || ""
                        )}
                    </small>

                </article>

            `
        ).join("");

}


/* =========================================================
   PRESCRIPTION
========================================================= */

function initializePrescription() {

    $("#savePrescriptionButton")
        ?.addEventListener(
            "click",
            savePrescription
        );

}


async function savePrescription() {

    if (!AppState.user) {
        return;
    }


    const payload = {

        user_id:
            AppState.user.id,

        title:
            $("#prescriptionTitle")
                .value
                .trim()
            || "Prescription Draft",

        patient_name:
            $("#patientName")
                .value
                .trim(),

        patient_age:
            $("#patientAge")
                .value
                ? Number(
                    $("#patientAge").value
                )
                : null,

        patient_gender:
            $("#patientGender")
                .value
            || null,

        notes:
            $("#prescriptionNotes")
                .value
                .trim(),

        status:
            "draft"

    };


    const {
        error
    } =
        await supabaseClient
            .from("prescriptions")
            .insert(payload);


    if (error) {

        setMessage(
            $("#prescriptionMessage"),
            error.message,
            "error"
        );

        return;

    }


    setMessage(
        $("#prescriptionMessage"),
        "Prescription draft saved.",
        "success"
    );

}


/* =========================================================
   SEARCH
========================================================= */

function initializeSearch() {

    $("#searchButton")
        ?.addEventListener(
            "click",
            openSearch
        );

    $$("[data-close-modal]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () =>
                    closeModal(
                        button.dataset.closeModal
                    )
            );

        });


    $("#searchModal")
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "searchModal"
                ) {

                    closeSearch();

                }

            }
        );


    $("#searchInput")
        ?.addEventListener(
            "input",
            debounce(
                performSearch,
                300
            )
        );


    document.addEventListener(
        "keydown",
        event => {

            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === "k"
            ) {

                event.preventDefault();

                openSearch();

            }

            if (
                event.key === "Escape"
            ) {

                closeSearch();

            }

        }
    );

}


function openSearch() {

    $("#searchModal")
        ?.classList.add("open");

    $("#searchModal")
        ?.setAttribute(
            "aria-hidden",
            "false"
        );

    $("#searchInput")?.focus();

}


function closeSearch() {

    $("#searchModal")
        ?.classList.remove("open");

    $("#searchModal")
        ?.setAttribute(
            "aria-hidden",
            "true"
        );

    $("#searchInput").value = "";

    $("#searchResults").innerHTML = "";

}


async function performSearch() {

    const query =
        $("#searchInput")
            .value
            .trim();


    const results =
        $("#searchResults");


    if (
        query.length < 2
    ) {

        results.innerHTML =
            emptyBox(
                "Start typing.",
                "Search diseases, drugs and investigations."
            );

        return;

    }


    results.innerHTML =
        loadingBox(
            "Searching..."
        );


    const pattern =
        `%${query}%`;


    const [
        diseases,
        drugs,
        investigations
    ] = await Promise.all([

        supabaseClient
            .from("diseases")
            .select(
                "id,name,short_description"
            )
            .eq(
                "is_published",
                true
            )
            .ilike(
                "name",
                pattern
            )
            .limit(10),

        supabaseClient
            .from("drugs")
            .select(
                "id,name,generic_name"
            )
            .eq(
                "is_active",
                true
            )
            .ilike(
                "name",
                pattern
            )
            .limit(10),

        supabaseClient
            .from("investigations")
            .select(
                "id,name,description"
            )
            .eq(
                "is_active",
                true
            )
            .ilike(
                "name",
                pattern
            )
            .limit(10)

    ]);


    const items = [];


    (diseases.data || [])
        .forEach(item =>
            items.push({
                type: "Disease",
                id: item.id,
                name: item.name,
                description:
                    item.short_description
            })
        );


    (drugs.data || [])
        .forEach(item =>
            items.push({
                type: "Drug",
                id: item.id,
                name: item.name,
                description:
                    item.generic_name
            })
        );


    (investigations.data || [])
        .forEach(item =>
            items.push({
                type: "Investigation",
                id: item.id,
                name: item.name,
                description:
                    item.description
            })
        );


    if (!items.length) {

        results.innerHTML =
            emptyBox(
                "No results.",
                `Nothing matched "${query}".`
            );

        return;

    }


    results.innerHTML =
        items.map(
            item => `

                <button
                    class="search-result"
                    type="button"
                    data-search-type="${item.type}"
                    data-search-id="${item.id}"
                >

                    <strong>
                        ${escapeHtml(item.name)}
                    </strong>

                    <small>
                        ${escapeHtml(
                            item.type
                        )}
                        ${
                            item.description
                                ? ` • ${escapeHtml(item.description)}`
                                : ""
                        }
                    </small>

                </button>

            `
        ).join("");


    $$("[data-search-type]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const type =
                        button.dataset.searchType;

                    const id =
                        button.dataset.searchId;

                    closeSearch();

                    if (
                        type === "Disease"
                    ) {

                        setView(
                            "rx-library"
                        ).then(
                            () =>
                                openDiseaseReader(
                                    id
                                )
                        );

                    }

                }
            );

        });

}


/* =========================================================
   PROFILE
========================================================= */

function initializeProfile() {

    $("#profileButton")
        ?.addEventListener(
            "click",
            () => {

                if (
                    AppState.user?.role === "admin"
                ) {

                    setView(
                        "admin-manager"
                    );

                }

            }
        );

}


/* =========================================================
   GENERIC MODAL
========================================================= */

function openModal({
    title,
    eyebrow,
    body,
    submit,
    onSubmit
}) {

    const modal =
        $("#appModal");

    const card =
        $("#appModalCard");


    card.innerHTML = `

        <div class="modal-header">

            <div>

                <span class="eyebrow">
                    ${escapeHtml(eyebrow)}
                </span>

                <h2>
                    ${escapeHtml(title)}
                </h2>

            </div>

            <button
                class="modal-close"
                type="button"
                id="genericModalClose"
            >
                ×
            </button>

        </div>

        <form id="genericModalForm">

            ${body}

            <div class="modal-actions">

                <button
                    class="secondary-button"
                    type="button"
                    id="genericModalCancel"
                >
                    Cancel
                </button>

                <button
                    class="primary-button"
                    type="submit"
                >
                    ${escapeHtml(submit)}
                </button>

            </div>

        </form>

    `;


    modal.classList.add("open");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    $("#genericModalClose")
        .addEventListener(
            "click",
            closeModal
        );

    $("#genericModalCancel")
        .addEventListener(
            "click",
            closeModal
        );


    $("#genericModalForm")
        .addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                await onSubmit();

            }
        );


    $("#modalName")?.focus();

}


function closeModal(id = "appModal") {

    const modal =
        $(`#${id}`);

    if (!modal) {
        return;
    }

    modal.classList.remove("open");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

}


document.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            $("#appModal")
        ) {

            closeModal();

        }

    }
);


/* =========================================================
   HELPERS
========================================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");

}


function escapeAttr(value) {

    return escapeHtml(value);

}


function slugify(value) {

    return String(value || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g,"-")
        .replace(/^-+|-+$/g,"");

}


function setMessage(
    element,
    text,
    type
) {

    if (!element) {
        return;
    }

    element.textContent =
        text || "";

    element.className =
        "message";

    if (type) {
        element.classList.add(type);
    }

}


function loadingBox(text) {

    return `

        <div class="loading-box">

            <strong>
                ${escapeHtml(text)}
            </strong>

        </div>

    `;

}


function emptyBox(
    title,
    description
) {

    return `

        <div class="empty-box">

            <strong>
                ${escapeHtml(title)}
            </strong>

            <span>
                ${escapeHtml(description)}
            </span>

        </div>

    `;

}


function errorBox(
    message
) {

    return `

        <div class="error-box">

            <strong>
                Something went wrong
            </strong>

            <span>
                ${escapeHtml(message)}
            </span>

        </div>

    `;

}


function debounce(
    callback,
    delay
) {

    let timer;

    return (...args) => {

        clearTimeout(timer);

        timer =
            setTimeout(
                () => callback(...args),
                delay
            );

    };

}


/* =========================================================
   PUBLIC API
========================================================= */

window.RxMaster = {

    state:
        AppState,

    navigate:
        setView,

    openSearch,

    closeSearch,

    openSidebar,

    closeSidebar

};