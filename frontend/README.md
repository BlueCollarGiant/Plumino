# Plumino - Frontend Project README

## Overview
Plumino (formerly BioKyowa Inc.) is a biotechnology company based in Cape Girardeau, Missouri. Following its recent acquisition, the company has been rebranded as Plumino while maintaining its core operations in fermentation facilities to produce bulk amino acids. Originally established as BioKyowa Inc. in 1982, production began in 1984 with amino-acid feed supplements. It was the first major plant investment by a Japanese company in Missouri and the first commercial lysine-producing plant in the U.S. The company was previously a wholly owned subsidiary of Kyowa Hakko Bio Co., Ltd., part of Kirin Holdings.

## Netlify Deployment
- Ensure your backend is reachable from Netlify (e.g., Render, Railway, or a self-hosted HTTPS endpoint).
- Connect the repository to Netlify; the included `netlify.toml` sets the base directory to `frontend`, runs `npm install && npm run build`, and publishes `dist/frontend-app/browser`.
- In Netlify → Site configuration → Environment variables, add `NG_APP_API_BASE_URL` pointing to your backend (e.g., `https://plumino-api.example.com/api`). Optional: set `NG_APP_SSE_URL` if your Server-Sent Events endpoint lives outside `${NG_APP_API_BASE_URL}/sse/notifications`.
- Trigger a deploy. Angular bundles pick up `NG_APP_*` variables at build time; local development continues to default to `http://localhost:5000/api`.
- For SPA routing support, the generated `_redirects` rule in `netlify.toml` sends all non-asset paths to `index.html`.

## History and Parent Company
- Construction began in 1982; production launched in 1984 with swine and poultry feed supplements.
- Expanded over 30+ years into multiple facilities producing high-quality amino acids.
- Parent: Kyowa Hakko Bio Co., Ltd. (KHB), formed in 2008 as part of Kirin Group.
- President Yoshimura thanks the community and employees, reaffirming commitment to premium amino acids.

## Operations and Manufacturing
- Uses advanced fermentation technology.
- Produces amino acids for nutrition, food production, pharmaceuticals, cosmetics, and fertilizers.

## Fermentation and Amino-acid Production
- Fermentation is a controlled metabolic process converting carbohydrates into acids or alcohol.
- Human body uses 20 amino acids (essential and non-essential).

## Manufacturing Process
- Begins in sterile labs and proceeds through fermenters and bioreactors.
- Unit operations include filtration, evaporation, crystallization, isolation, drying, milling, and packaging.
- Certifications include ISO 9001:2015, FSSC 22000, HACCP, Kosher, and Halal.
- Adheres to current Good Manufacturing Practices (cGMP).

## Products
Plumino (formerly BioKyowa) produces high-quality amino acids used in supplements, cosmetics, and pharmaceutical precursors.

## Community Involvement and Awards
- Supports local organizations: Noon Optimists, Lions Club, Cape Girardeau Chamber of Commerce.
- Sponsored Safe House for Women.
- Awards: Community Achievement Award, Governor's New Product Award, Industry of the Year Award.
- Sponsors scholarships and cultural exchange programs.

## Global Network
- United States: Kyowa Hakko USA serves as a sales office.
- Japan: Kyowa Hakko Bio manages manufacturing and global operations.
- Additional international locations extend distribution and collaboration.

## Contact Information
Plumino (formerly BioKyowa Inc.)
5469 Nash Road, PO Box 1550, Cape Girardeau, MO 63702-1550
Phone: (573) 335-4849

*Note: Contact information is currently being updated following the company's rebranding to Plumino. Previous contact details under BioKyowa Inc. may still be in transition.*

Historical Contact Information:
BioKyowa Inc. - info@biokyowa.com, jobs@biokyowa.com
Kyowa Hakko USA, Inc. - info@kyowa-usa.com

## Careers and Company Culture
- Careers site tagline: "We're all about life. Especially yours."
- Values emphasize collaboration, respect, and rewards with benefits.
- Culture promotes inclusion, equality, recognition, and work-life balance.
- Employee support includes perks aligned with long-term growth.

## Conclusion
Originally as BioKyowa, the company pioneered U.S. fermentation-based amino acid production. Now operating as Plumino following its acquisition, the company maintains its decades of experience and certifications as a major producer of high-quality amino acids. Plumino continues to invest in technology, community, and employees while building upon the strong foundation established during its years as BioKyowa Inc.
