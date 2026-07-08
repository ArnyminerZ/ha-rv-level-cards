import { getEntitySuggestion as bubbleSuggestion } from "./bubble-card.js";
import { getEntitySuggestion as topdownSuggestion } from "./topdown-card.js";

const DOCS_URL = "https://github.com/ArnyminerZ/ha-rv-level-cards";

window.customCards = window.customCards || [];
window.customCards.push(
  {
    type: "rv-level-bubble-card",
    name: "RV Level - Bubble level",
    description: "A circular bubble-level indicator that moves with the RV Level device's pitch/roll and turns green when the vehicle is level.",
    preview: true,
    documentationURL: DOCS_URL,
    getEntitySuggestion: bubbleSuggestion,
  },
  {
    type: "rv-level-topdown-card",
    name: "RV Level - Top-down chocks",
    description: "A top-down view of your vehicle showing how tall a chock to place under each wheel, and whether the vehicle is level/levelable.",
    preview: true,
    documentationURL: DOCS_URL,
    getEntitySuggestion: topdownSuggestion,
  }
);
