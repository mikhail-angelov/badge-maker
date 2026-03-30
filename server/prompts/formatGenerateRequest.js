const buildRefinementExamples = (stateSummary) => {
  if (!stateSummary?.availableRoleLabels?.length) {
    return "";
  }

  return `
Refinement examples:
- Recolor an existing center circle:
  {"type":"updateObject","payload":{"roleLabel":"center-circle","properties":{"color":"#8a1c1c"}}}
- Resize an outer ring:
  {"type":"updateObject","payload":{"roleLabel":"outer-ring","properties":{"radius":110}}}
- Edit curved top text:
  {"type":"updateObject","payload":{"roleLabel":"top-text","properties":{"text":"SHERIFF","fontSize":20}}}
- Reorder a center icon:
  {"type":"moveToFront","payload":{"roleLabel":"center-icon"}}
- Align two objects:
  {"type":"alignObjects","payload":{"roleLabels":["center-circle","center-icon"],"alignment":"center-horizontal"}}
- If the user explicitly references a missing role label and asks to edit it, preserve that missing label so the frontend can warn:
  {"type":"updateObject","payload":{"roleLabel":"missing-label","properties":{"color":"#ff0000"}}}`;
};

const buildDraftExamples = () => `
Draft examples:
- Two concentric circles with ring text and center initials:
  {
    "type":"createShape",
    "payload":{
      "shapeType":"circle",
      "roleLabel":"outer-ring",
      "properties":{"x":200,"y":160,"radius":110,"color":"#000000"}
    }
  }
  {
    "type":"createShape",
    "payload":{
      "shapeType":"circle",
      "roleLabel":"inner-circle",
      "properties":{"x":200,"y":160,"radius":82,"color":"#000000"}
    }
  }
  {
    "type":"createShape",
    "payload":{
      "shapeType":"circle-text",
      "roleLabel":"ring-text",
      "properties":{"x":200,"y":160,"radius":102,"layoutMode":"full-ring","text":"undefined is not a function * ","fontFamily":"Arial","fontSize":14,"color":"#000000","startAngle":0,"textInside":true,"inwardFacing":true}
    }
  }
  {
    "type":"createShape",
    "payload":{
      "shapeType":"text",
      "roleLabel":"center-title",
      "properties":{"x":200,"y":160,"anchor":"center","text":"JS","fontFamily":"Arial","fontSize":28,"color":"#000000","textAlign":"center","textBaseline":"middle"}
    }
  }`;

const buildCreateOnlyInstructions = ({ stateSummary, forceCreateOnly = false }) => {
  if (!forceCreateOnly && stateSummary?.availableRoleLabels?.length) {
    return "";
  }

  return `

Important constraint:
- There are no targetable existing objects for refinement right now.
- Do not use updateObject, removeObject, moveToFront, moveToBack, alignObjects, or selectObjects against existing objects.
- Return a self-contained create-from-scratch scenario using createShape actions, or replaceCanvas only if absolutely necessary.`;
};

export const formatGenerateRequest = ({ prompt, stateSummary, forceCreateOnly = false }) => `
User prompt:
${prompt}

Current editor state summary:
${JSON.stringify(stateSummary, null, 2)}

Available role labels:
${stateSummary?.availableRoleLabels?.length ? stateSummary.availableRoleLabels.join(", ") : "(none)"}

Return a JSON object with this shape:
{
  "schemaVersion": 1,
  "title": "short plan title",
  "actions": [
    {
      "type": "createShape",
      "label": "short description",
      "payload": {
        "shapeType": "image",
        "roleLabel": "center-icon",
        "properties": {
          "x": 152,
          "y": 112,
          "width": 96,
          "height": 96,
          "svgPrompt": "simple police shield icon with a bold capital P"
        }
      }
    }
  ]
}

Rules:
- Use roleLabel references for existing objects when possible.
- If there are no available role labels, do not emit actions that target existing objects.
- Keep numeric values finite and within normal canvas bounds.
- Use only the allowed fonts.
- If the user asks for another font, substitute the closest allowed font instead of returning an unsupported one.
- For simple badge symbols, prefer image shapes with properties.svgPrompt instead of external URLs.
- For follow-up edits, prefer updating or reordering existing role labels instead of recreating everything.
- If the user explicitly names a missing roleLabel, preserve that exact label instead of rewriting it to a different object.
- For ring text between circles, use shapeType "circle-text" with explicit x, y, and radius.
- Use properties.layoutMode for ring text when the wording is too long for a clean top arc.
- For ring text, preserve the exact requested wording and punctuation.
- Keep ring-text geometry conservative; deterministic fitting may refine radius or fontSize before preview.
- For center initials inside a circle, use the exact circle center and properties.anchor="center".
- Do not include comments.
- Do not wrap the JSON in markdown fences.
${buildDraftExamples()}
${buildRefinementExamples(stateSummary)}
${buildCreateOnlyInstructions({ stateSummary, forceCreateOnly })}
`;

export default formatGenerateRequest;
