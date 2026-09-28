// ========================================
// LEADFLOW
// V1 - Front-end / Demonstração
// ========================================


// ------------------------------
// ELEMENTOS
// ------------------------------

const pages = document.querySelectorAll(".page");
const navItems = document.querySelectorAll(".nav-item");

const pageTitle = document.getElementById("pageTitle");

const searchButton = document.getElementById("searchButton");

const segmentInput = document.getElementById("segment");
const cityInput = document.getElementById("city");
const quantityInput = document.getElementById("quantity");

const resultsArea = document.getElementById("resultsArea");
const loading = document.getElementById("loading");

const resultsTable = document.getElementById("resultsTable");

const onlyWithoutSite = document.getElementById("onlyWithoutSite");
const resultSearch = document.getElementById("resultSearch");

const savedSearch = document.getElementById("savedSearch");
const statusFilter = document.getElementById("statusFilter");


// ------------------------------
// DADOS
// ------------------------------

let searchResults = [];

let savedLeads =
    JSON.parse(localStorage.getItem("leadflow_leads")) || [];


// ------------------------------
// NAVEGAÇÃO
// ------------------------------

const titles = {
    dashboard: "Visão geral",
    generator: "Gerar leads",
    leads: "Meus leads"
};


navItems.forEach(item => {

    item.addEventListener("click", () => {

        changePage(item.dataset.page);

    });

});


function changePage(page) {

    pages.forEach(p => {
        p.classList.remove("active");
    });

    navItems.forEach(item => {
        item.classList.remove("active");
    });


    document
        .getElementById(page)
        .classList.add("active");


    const nav = document.querySelector(
        `[data-page="${page}"]`
    );

    if (nav) {
        nav.classList.add("active");
    }


    pageTitle.textContent = titles[page];


    if (page === "dashboard") {
        updateDashboard();
    }

    if (page === "leads") {
        renderSavedLeads();
    }

}


function openGenerator() {

    changePage("generator");

    setTimeout(() => {
        segmentInput.focus();
    }, 100);

}


// ------------------------------
// GERAR LEADS
// ------------------------------

searchButton.addEventListener("click", searchCompanies);


async function searchCompanies() {

    const segment = segmentInput.value.trim();
    const city = cityInput.value.trim();
    const quantity = Number(quantityInput.value);

    if (!segment || !city) {
        showToast("Informe o segmento e a cidade.");
        return;
    }

    resultsArea.classList.add("hidden");
    loading.classList.remove("hidden");

    searchButton.disabled = true;
    searchButton.textContent = "Buscando...";

    try {

        const category = getCategory(segment);

        const params = new URLSearchParams({
            city: city,
            category: category,
            limit: quantity
        });

        const response = await fetch(
            `/.netlify/functions/leads?${params.toString()}`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Erro ao buscar empresas."
            );
        }

        searchResults = data.results || [];

        document.getElementById(
            "searchDescription"
        ).textContent = `${segment} • ${city}`;

        renderResults();

        resultsArea.classList.remove("hidden");

        if (searchResults.length === 0) {
            showToast("Nenhuma empresa encontrada.");
        } else {
            showToast(
                `${searchResults.length} empresas reais encontradas.`
            );
        }

    } catch (error) {

        console.error(error);

        showToast(
            error.message || "Erro ao realizar a pesquisa."
        );

    } finally {

        loading.classList.add("hidden");
        searchButton.disabled = false;
        searchButton.textContent = "Buscar empresas";
    }
}

function getCategory(segment) {

    const text = segment
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    if (
        text.includes("barbearia") ||
        text.includes("barbeiro") ||
        text.includes("cabeleireiro") ||
        text.includes("salao") ||
        text.includes("beleza")
    ) {
        return "service.beauty";
    }

    // Temporariamente, buscas desconhecidas
    // usam a categoria comercial geral.
    return "commercial";
}   

// ------------------------------
// MOSTRAR RESULTADOS
// ------------------------------

function renderResults() {

    const search =
        resultSearch.value
            .toLowerCase()
            .trim();


    const noSiteOnly =
        onlyWithoutSite.checked;


    const filtered =
        searchResults.filter(company => {

            const matchesSearch =
                company.name
                    .toLowerCase()
                    .includes(search) ||

                company.phone
                    .toLowerCase()
                    .includes(search) ||

                company.city
                    .toLowerCase()
                    .includes(search);


            const matchesSite =
                !noSiteOnly ||
                !company.website;


            return (
                matchesSearch &&
                matchesSite
            );

        });


    document.getElementById(
        "resultCount"
    ).textContent = filtered.length;


    resultsTable.innerHTML = "";


    filtered.forEach(company => {

        const saved =
            savedLeads.some(
                lead =>
                    lead.name === company.name &&
                    lead.phone === company.phone
            );


        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>

                <div class="company">

                    <div class="company-avatar">
                        ${company.name.charAt(0)}
                    </div>

                    <div>
                        <strong>${company.name}</strong>
                        <small>${company.category}</small>
                    </div>

                </div>

            </td>


            <td>
                ${company.phone}
            </td>


            <td>
                <strong>${company.city}</strong>
                <br>
                <small>${company.address}</small>
            </td>


            <td>

                ${
                    company.website

                    ? `
                    <span class="has-site">
                        Possui site
                    </span>
                    `

                    : `
                    <span class="no-site">
                        Sem website
                    </span>
                    `
                }

            </td>


            <td>

                <button
                    class="save-button
                    ${saved ? "saved-button" : ""}"

                    onclick="saveLead(${company.id})"
                >

                    ${
                        saved
                        ? "✓ Salvo"
                        : "+ Salvar"
                    }

                </button>

            </td>

        `;


        resultsTable.appendChild(row);

    });

}


onlyWithoutSite.addEventListener(
    "change",
    renderResults
);


resultSearch.addEventListener(
    "input",
    renderResults
);


// ------------------------------
// SALVAR LEAD
// ------------------------------

function saveLead(id) {

    const company =
        searchResults.find(
            company =>
                String(company.id) === String(id)
        );


    if (!company) {
        return;
    }


    const exists =
        savedLeads.some(
            lead =>
                lead.name === company.name &&
                lead.phone === company.phone
        );


    if (exists) {

        showToast(
            "Esse lead já está salvo."
        );

        return;
    }


    savedLeads.unshift({
        ...company,
        savedAt: new Date().toISOString()
    });


    saveLocal();


    renderResults();
    updateDashboard();


    showToast(
        "Lead salvo com sucesso."
    );

}


// ------------------------------
// MEUS LEADS
// ------------------------------

function renderSavedLeads() {

    const table =
        document.getElementById(
            "savedTable"
        );


    const empty =
        document.getElementById(
            "savedEmpty"
        );


    const search =
        savedSearch.value
            .toLowerCase()
            .trim();


    const selectedStatus =
        statusFilter.value;


    const filtered =
        savedLeads.filter(lead => {

            const matchesSearch =
                lead.name
                    .toLowerCase()
                    .includes(search) ||

                lead.phone
                    .toLowerCase()
                    .includes(search);


            const matchesStatus =
                selectedStatus === "all" ||
                lead.status === selectedStatus;


            return (
                matchesSearch &&
                matchesStatus
            );

        });


    table.innerHTML = "";


    if (filtered.length === 0) {

        empty.classList.remove("hidden");

        return;

    }


    empty.classList.add("hidden");


    filtered.forEach(lead => {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>

                <div class="company">

                    <div class="company-avatar">
                        ${lead.name.charAt(0)}
                    </div>

                    <div>

                        <strong>
                            ${lead.name}
                        </strong>

                        <small>
                            ${lead.city}
                        </small>

                    </div>

                </div>

            </td>


            <td>
                ${lead.phone}
            </td>


            <td>

                ${
                    lead.website

                    ? `
                    <span class="has-site">
                        ${lead.website}
                    </span>
                    `

                    : `
                    <span class="no-site">
                        Sem site
                    </span>
                    `
                }

            </td>


            <td>

                <select
                    class="status-select"

                    onchange="
                        updateStatus(
                            '${lead.id}',
                            this.value
                        )
                    "
                >

                    ${statusOptions(lead.status)}

                </select>

            </td>


            <td>

                <input
                    class="note-input"

                    value="${escapeHTML(
                        lead.note || ""
                    )}"

                    placeholder="Adicionar observação..."

                    onchange="
                        updateNote(
                            '${lead.id}',
                            this.value
                        )
                    "
                >

            </td>


            <td>

                <button
                    class="delete-button"

                    onclick="
                        deleteLead(
                            '${lead.id}'
                        )
                    "
                >
                    Excluir
                </button>

            </td>

        `;


        table.appendChild(row);

    });

}


savedSearch.addEventListener(
    "input",
    renderSavedLeads
);


statusFilter.addEventListener(
    "change",
    renderSavedLeads
);


// ------------------------------
// STATUS
// ------------------------------

function statusOptions(current) {

    const statuses = [
        "Novo",
        "Contatado",
        "Interessado",
        "Fechado",
        "Perdido"
    ];


    return statuses
        .map(status => `

            <option
                value="${status}"
                ${status === current
                    ? "selected"
                    : ""}
            >

                ${status}

            </option>

        `)
        .join("");

}


function updateStatus(id, status) {

    const lead =
        savedLeads.find(
            lead =>
                String(lead.id) === String(id)
        );


    if (!lead) {
        return;
    }


    lead.status = status;


    saveLocal();
    updateDashboard();


    showToast(
        "Status atualizado."
    );

}


// ------------------------------
// OBSERVAÇÕES
// ------------------------------

function updateNote(id, note) {

    const lead =
        savedLeads.find(
            lead =>
                String(lead.id) === String(id)
        );


    if (!lead) {
        return;
    }


    lead.note = note;

    saveLocal();


    showToast(
        "Observação salva."
    );

}


// ------------------------------
// EXCLUIR
// ------------------------------

function deleteLead(id) {

    const confirmed =
        confirm(
            "Deseja remover esse lead?"
        );


    if (!confirmed) {
        return;
    }


    savedLeads =
        savedLeads.filter(
            lead =>
                String(lead.id) !== String(id)
        );


    saveLocal();

    renderSavedLeads();
    updateDashboard();
    renderResults();


    showToast(
        "Lead removido."
    );

}


// ------------------------------
// DASHBOARD
// ------------------------------

function updateDashboard() {

    const total =
        savedLeads.length;


    const withoutSite =
        savedLeads.filter(
            lead => !lead.website
        ).length;


    const contacted =
        savedLeads.filter(
            lead =>
                lead.status !== "Novo"
        ).length;


    const negotiations =
        savedLeads.filter(
            lead =>
                lead.status === "Interessado"
        ).length;


    document.getElementById(
        "totalLeads"
    ).textContent = total;


    document.getElementById(
        "withoutSite"
    ).textContent = withoutSite;


    document.getElementById(
        "contacted"
    ).textContent = contacted;


    document.getElementById(
        "negotiations"
    ).textContent = negotiations;


    renderRecentLeads();

}


// ------------------------------
// LEADS RECENTES
// ------------------------------

function renderRecentLeads() {

    const container =
        document.getElementById(
            "recentLeads"
        );


    if (savedLeads.length === 0) {

        container.className =
            "empty-state";


        container.innerHTML = `

            <div class="empty-icon">
                ⌕
            </div>

            <h3>
                Nenhum lead salvo ainda
            </h3>

            <p>
                Faça sua primeira busca e
                comece a montar sua lista
                de potenciais clientes.
            </p>

            <button
                class="primary"
                onclick="openGenerator()"
            >
                Gerar leads
            </button>

        `;


        return;

    }


    container.className =
        "table-wrapper";


    const recent =
        savedLeads.slice(0, 5);


    container.innerHTML = `

        <table>

            <thead>
                <tr>
                    <th>Empresa</th>
                    <th>Telefone</th>
                    <th>Website</th>
                    <th>Status</th>
                </tr>
            </thead>

            <tbody>

                ${recent.map(lead => `

                    <tr>

                        <td>

                            <div class="company">

                                <div class="company-avatar">
                                    ${lead.name.charAt(0)}
                                </div>

                                <div>

                                    <strong>
                                        ${lead.name}
                                    </strong>

                                    <small>
                                        ${lead.city}
                                    </small>

                                </div>

                            </div>

                        </td>

                        <td>
                            ${lead.phone}
                        </td>

                        <td>

                            ${
                                lead.website

                                ? `
                                <span class="has-site">
                                    Possui site
                                </span>
                                `

                                : `
                                <span class="no-site">
                                    Sem site
                                </span>
                                `
                            }

                        </td>

                        <td>
                            ${lead.status}
                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>

    `;

}


// ------------------------------
// LOCAL STORAGE
// ------------------------------

function saveLocal() {

    localStorage.setItem(
        "leadflow_leads",
        JSON.stringify(savedLeads)
    );

}


// ------------------------------
// EXPORTAR RESULTADOS
// ------------------------------

function exportResults() {

    if (!searchResults.length) {

        showToast(
            "Nenhum resultado para exportar."
        );

        return;
    }


    exportCSV(
        searchResults,
        "leadflow-resultados.csv"
    );

}


// ------------------------------
// EXPORTAR SALVOS
// ------------------------------

function exportSavedLeads() {

    if (!savedLeads.length) {

        showToast(
            "Nenhum lead salvo."
        );

        return;
    }


    exportCSV(
        savedLeads,
        "meus-leads.csv"
    );

}


// ------------------------------
// CSV
// ------------------------------

function exportCSV(data, filename) {

    const header = [
        "Empresa",
        "Telefone",
        "Cidade",
        "Endereco",
        "Website",
        "Status",
        "Observacao"
    ];


    const rows =
        data.map(item => [

            item.name,
            item.phone,
            item.city,
            item.address,
            item.website || "Sem site",
            item.status || "Novo",
            item.note || ""

        ]);


    const csv = [

        header,

        ...rows

    ]
    .map(row =>

        row.map(value =>
            `"${String(value || "")
                .replace(/"/g, '""')}"`
        )
        .join(";")

    )
    .join("\n");


    const blob =
        new Blob(
            ["\ufeff" + csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href = url;
    link.download = filename;

    link.click();


    URL.revokeObjectURL(url);


    showToast(
        "Arquivo CSV exportado."
    );

}


// ------------------------------
// UTILIDADES
// ------------------------------

function randomNumber(min, max) {

    return Math.floor(
        Math.random() *
        (max - min + 1)
    ) + min;

}


function capitalize(text) {

    return text
        .charAt(0)
        .toUpperCase() +
        text.slice(1);

}


function slugify(text) {

    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(/[^a-z0-9]/g, "");

}


function escapeHTML(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ------------------------------
// TOAST
// ------------------------------

let toastTimeout;


function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    toast.textContent = message;

    toast.classList.add("show");


    clearTimeout(toastTimeout);


    toastTimeout =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 2200);

}


// ------------------------------
// INICIALIZAÇÃO
// ------------------------------

updateDashboard();