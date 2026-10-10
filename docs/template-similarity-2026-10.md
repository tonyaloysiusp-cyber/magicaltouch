# Template similarity check — distinct collection (Oct 2026)

Method: 16×16 difference hash (60%) + 8×8 colour thumbnail distance (40%) on each template thumbnail. 1.0 = identical. Scores above ~0.85 are reviewed by eye; most high scores come from shared plain/white backgrounds, not shared layouts.

- New templates checked: 60
- Existing collection thumbnails compared against: 354

## Highest scores, new vs new

| score | template | template |
|---|---|---|
| 0.839 | minimal-architect-card | editorial-studio-letterhead |
| 0.812 | minimal-architect-card | customer-testimonial-template-post |
| 0.807 | saffron-food-magazine | vows-wedding-magazine |
| 0.802 | pastel-tips-carousel | scandi-opening-hours-sign |
| 0.799 | editorial-studio-letterhead | scandi-opening-hours-sign |
| 0.794 | minimal-architect-card | pastel-tips-carousel |
| 0.793 | editorial-studio-letterhead | pastel-tips-carousel |
| 0.791 | minimal-arch-art-exhibition-poster | form-architecture-journal |
| 0.785 | elegant-champagne-40th-invitation | customer-testimonial-template-post |
| 0.785 | minimal-architect-card | scandi-opening-hours-sign |

## Highest scores, new vs existing

| score | new template | closest existing |
|---|---|---|
| 0.870 | minimal-architect-card | clinic-clean-card |
| 0.858 | editorial-studio-letterhead | medical-clinic-letterhead |
| 0.831 | pastel-tips-carousel | clinic-clean-card |
| 0.831 | scandi-opening-hours-sign | clinic-clean-card |
| 0.817 | nordic-recipe-card-story | new-product-drop |
| 0.817 | elegant-champagne-40th-invitation | golden-fifty |
| 0.815 | before-after-split-post | sage-vows-half-and-half-post |
| 0.815 | customer-testimonial-template-post | professional-certification |
| 0.813 | minimal-arch-art-exhibition-poster | wedding-countdown-story |
| 0.807 | art-deco-black-gold-gala-poster | black-gold-monogram-card |

## Action taken

- `minimalist-line-birthday-invitation` repeated the layout of the existing `minimal-wedding-type` (left rule + stacked type). It was redesigned around a centred ring and date band before publishing.
- The other top pairs were checked visually: they share only a light background, not composition, typography or palette.
