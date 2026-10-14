const $ = (id) => document.getElementById(id);

let selectedBookId = null;
let toastTimer;

async function api(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}

function showToast(message, error = false) {
    const toast = $("toast");
    toast.textContent = message;
    toast.className = "toast show" + (error ? " error" : "");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.className = "toast";
    }, 2800);
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

async function loadBooks() {
    try {
        const books = await api("/api/books");

        $("totalBooks").textContent = books.length;
        $("bookCount").textContent = books.length;

        $("emptyState").hidden = books.length !== 0;

        $("bookGrid").innerHTML = books.map((book) => `
            <article class="book-card">
                <div class="book-cover" aria-hidden="true">📖</div>
                <span class="book-id">BOOK ID · ${book.id}</span>
                <h3>${escapeHTML(book.title)}</h3>
                <p class="author">by ${escapeHTML(book.author)}</p>
                <div class="card-footer">
                    <span>Available in catalogue</span>
                    <button class="card-delete"
                        data-delete-id="${book.id}"
                        type="button">Remove</button>
                </div>
            </article>
        `).join("");
    } catch (error) {
        showToast("Cannot connect to Java backend. Start the server first.", true);
    }
}

$("bookForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = $("bookId").value.trim();
    const title = $("bookTitle").value.trim();
    const author = $("bookAuthor").value.trim();

    if (!id || Number(id) <= 0 || !title || !author) {
        showToast("Please enter valid book details.", true);
        return;
    }

    try {
        const body = new URLSearchParams({ id, title, author });

        const result = await api("/api/books", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body
        });

        $("bookForm").reset();
        showToast(result.message);
        await loadBooks();
    } catch (error) {
        showToast(error.message, true);
    }
});

$("searchForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = $("searchId").value.trim();
    selectedBookId = null;
    $("deleteButton").disabled = true;

    try {
        const book = await api(
            "/api/search?id=" + encodeURIComponent(id)
        );

        selectedBookId = book.id;
        $("deleteButton").disabled = false;

        $("searchResult").innerHTML = `
            <div class="result-card">
                <span class="book-id">✦ BOOK FOUND · ID ${book.id}</span>
                <h3>${escapeHTML(book.title)}</h3>
                <p>Written by ${escapeHTML(book.author)}</p>
            </div>
        `;

        showToast("Book found successfully!");
    } catch (error) {
        $("searchResult").innerHTML = `
            <div class="empty-symbol">⌕</div>
            <p>${escapeHTML(error.message)}</p>
        `;
        showToast(error.message, true);
    }
});

async function deleteBook(id) {
    if (!confirm(`Remove Book ID ${id} from the catalogue?`)) {
        return;
    }

    try {
        const result = await api(
            "/api/books?id=" + encodeURIComponent(id),
            { method: "DELETE" }
        );

        if (selectedBookId === Number(id)) {
            selectedBookId = null;
            $("deleteButton").disabled = true;
            $("searchResult").innerHTML = `
                <div class="empty-symbol">⌕</div>
                <p>Search for another book.</p>
            `;
        }

        showToast(result.message);
        await loadBooks();
    } catch (error) {
        showToast(error.message, true);
    }
}

$("deleteButton").addEventListener("click", () => {
    if (selectedBookId !== null) {
        deleteBook(selectedBookId);
    }
});

$("bookGrid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-id]");
    if (button) {
        deleteBook(button.dataset.deleteId);
    }
});

$("refreshButton").addEventListener("click", loadBooks);

loadBooks();