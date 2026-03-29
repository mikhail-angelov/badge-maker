export const formatGenerateSvgRequest = ({ prompt }) => `
Generate a compact symbolic SVG icon for this badge request:
${prompt}

Requirements:
- plain SVG markup only
- include a bounded viewBox
- no scripts or external references
- monochrome icon only
- use black (#000000) as the one visible color across fills and strokes
- no gradients, no multicolor accents, no decorative shading
- center the icon composition within the viewBox
- keep it suitable for placement inside a badge medallion
`;

export default formatGenerateSvgRequest;
