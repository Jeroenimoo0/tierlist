
import Sortable from 'sortablejs';
import io from 'socket.io-client';
import './style.css';

if (navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/iPad/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i)) {
    document.write('<meta name="viewport" content="width=device-width, initial-scale=0.75" />');
}

const sortables = [];
const socket = io(window.location.host);

function emitUpdate() {
    socket.emit('update', getDatabase());
}

// Initialize sortable rows
for (let i = 1; i <= 7; i++) {
    const sortable = new Sortable(document.getElementById(`blockrow${i}`), {
        group: 'shared',
        animation: 150,
        onMove: function (evt) {
            let duplicate = findDuplicateURL(evt.dragged);
            if (duplicate != null) {
                duplicate.parentNode.removeChild(duplicate);
                return true; // Cancel sort
            }
        },
        onAdd: function (evt) {

            emitUpdate();
        },
        onUpdate: function (evt) {

            emitUpdate();
        },
        onRemove: emitUpdate
    });
    sortables.push(sortable);
}

function findDuplicateURL(item) {
    const url = blockDataMap.get(item).url;
    let duplicateItem = null;

    for (let i = 1; i <= 7; i++) {
        const row = document.getElementById(`blockrow${i}`);
        const otherItems = Array.from(row.querySelectorAll('.blockrow__block'))
            .filter(block => block !== item);  // Exclude the current item from the check

        const found = otherItems.find(block => block.dataset.url === url);
        if (found) {
            duplicateItem = found;
            break;
        }
    }

    return duplicateItem;
}

// Function to show and populate the edit bar
function showEditBar(blockData, block) {
    const editBar = document.getElementById("editBar");
    const editBarSpacer = document.getElementById("editBarSpacer");

    document.getElementById("readonlyUrlField").value = blockData.url;

    // Update checkboxes
    document.getElementById("platinumTagCheckbox").checked = blockData.tags?.includes("platinum") ?? false;
    document.getElementById("hiddenTagCheckbox").checked = blockData.tags?.includes("hidden") ?? false;
    document.getElementById("newTagCheckbox").checked = blockData.tags?.includes("new") ?? false;
    document.getElementById("hotTagCheckbox").checked = blockData.tags?.includes("hot") ?? false;

    editBar.style.display = "flex";
    editBarSpacer.style.display = "flex";

    currentlyEditedBlock = block;
}

const blockDataMap = new Map();

// Function to create a block element
function createBlockElement(blockData) {
    // Create block
    const block = document.createElement("div");
    block.className = "blockrow__block";
    block.dataset.url = blockData.url;

    // Add image
    const img = document.createElement("img");
    img.src = blockData.imgSrc;
    img.alt = "Placeholder";
    block.appendChild(img);

    // Add tag classes
    if (blockData.tags) {
        blockData.tags.forEach(tag => {
            block.classList.add(`blockrow__block--${tag}`);
        });
    }

    block.addEventListener("click", function () {
        const isEditMode = document.getElementById("editmodeInput").checked;
        if (isEditMode) {
            // Open editBar and pass block data
            showEditBar(blockData, block);
        } else {
            // Open the link as usual
            window.open(this.dataset.url, '_blank');
        }
    });

    blockDataMap.set(block, blockData);
    return block;
}

function addTag(element, tag) {
    const data = blockDataMap.get(element);
    if (!data.tags) {
        data.tags = [];
    }
    data.tags.push(tag);
    element.classList.add(`blockrow__block--${tag}`);
    blockDataMap.set(element, data);
    emitUpdate();
}

function removeTag(element, tag) {
    const data = blockDataMap.get(element);
    const index = data.tags.indexOf(tag);
    if (index > -1) {
        data.tags.splice(index, 1);
        element.classList.remove(`blockrow__block--${tag}`);
    }
    blockDataMap.set(element, data);
    emitUpdate();
}

// Function to add block
function addBlock() {
    const rowNum = document.getElementById("rowInput").value;
    const urlInput = document.getElementById("urlInput").value;
    if (rowNum >= 1 && rowNum <= 7 && urlInput) {
        const row = document.getElementById(`blockrow${rowNum}`);
        const url = urlInput.startsWith("http://") || urlInput.startsWith("https://") ? urlInput : "http://" + urlInput;
        const blockData = {
            url: url,
            imgSrc: "https://via.placeholder.com/100"
        };
        const block = createBlockElement(blockData);
        row.appendChild(block);
        emitUpdate();
    } else {
        alert("Invalid row number or URL");
    }
}

function getDatabase() {
    let db = {};
    for (let i = 1; i <= 7; i++) {
        const row = document.getElementById(`blockrow${i}`);
        const blocks = Array.from(row.querySelectorAll('.blockrow__block'));
        db[i] = blocks.map(block => blockDataMap.get(block));
    }
    return db;
}

socket.on('init', (data) => {
    populateHTML(data);
});

socket.on('update', (data) => {
    populateHTML(data);
});

function populateHTML(data) {
    // Parse the old editing url
    var currentEditingUrl = "";
    if (currentlyEditedBlock) {
        currentEditingUrl = blockDataMap.get(currentlyEditedBlock).url;
    }

    for (let i = 1; i <= 7; i++) {
        const row = document.getElementById(`blockrow${i}`);
        row.innerHTML = '';
        const blocks = data[i] || [];
        blocks.forEach(blockData => {
            const blockElement = createBlockElement(blockData);
            row.appendChild(blockElement);

            // Update current editing block if this is the new block
            if (blockData.url == currentEditingUrl) {
                showEditBar(blockData, blockElement);
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", function () {
    document.querySelector("button").addEventListener("click", addBlock);
});

// Initialize Delete Area
document.addEventListener("DOMContentLoaded", function () {
    new Sortable(document.getElementById("deleteArea"), {
        group: 'shared',
        animation: 150,
        onAdd: function (evt) {
            evt.item.parentNode.removeChild(evt.item);
            emitUpdate();
        }
    });
});

let currentlyEditedBlock = null; // To keep track of the currently edited block
document.addEventListener("DOMContentLoaded", function () {
    const editBar = document.getElementById("editBar");
    const editBarSpacer = document.getElementById("editBarSpacer");

    // Hide the bar when needed
    function hideEditBar() {
        editBar.style.display = "none";
        editBarSpacer.style.display = "none";
        currentlyEditedBlock = null; // Reset the edited block
    }

    // Close the bar on exit
    document.getElementById("closeEditBar").addEventListener("click", hideEditBar);

    // Tag event listener creator
    function handleTagCheckboxChange(tag) {
        return function () {
            if (currentlyEditedBlock) {
                if (this.checked) {
                    addTag(currentlyEditedBlock, tag);
                } else {
                    removeTag(currentlyEditedBlock, tag);
                }
            }
        };
    }

    // Link tag checkboxes
    document.getElementById("platinumTagCheckbox").addEventListener("change", handleTagCheckboxChange('platinum'));
    document.getElementById("hiddenTagCheckbox").addEventListener("change", handleTagCheckboxChange('hidden'));
    document.getElementById("newTagCheckbox").addEventListener("change", handleTagCheckboxChange('new'));
    document.getElementById("hotTagCheckbox").addEventListener("change", handleTagCheckboxChange('hot'));

    // Hide the bar initially
    hideEditBar();
});

document.addEventListener("DOMContentLoaded", function () {
    const editModeCheckbox = document.getElementById("editmodeInput");

    editModeCheckbox.addEventListener("change", function () {
        const isDisabled = !this.checked;
        sortables.forEach(sortable => {
            sortable.option("disabled", isDisabled);
        });
    });

    // Initialize based on the checkbox state
    editModeCheckbox.dispatchEvent(new Event('change'));
});