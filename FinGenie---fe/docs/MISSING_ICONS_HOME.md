# Missing Icons – Home Screen

All icons used on the Home screen are wired to real image assets (no emoji, no typography).

## Icons Currently Used ✓

| Location | Asset | Path |
|----------|-------|------|
| Header – greeting | `spark.png` | `assets/icons/spark.png` |
| Header – notifications | `notification.png` | `assets/icons/notification.png` |
| Balance card – star | `spark.png` | `assets/icons/spark.png` |
| Balance card – Income | `income.png` | `assets/icons/income.png` |
| Balance card – Expense | `expense.png` | `assets/icons/expense.png` |
| Add Income button | `income.png` | `assets/icons/income.png` |
| Add Expense button | `expense.png` | `assets/icons/expense.png` |
| Finladin mascot | `genie-pet.png` | `assets/image/genie-pet.png` |
| Finladin streak | `streak.png` | `assets/icons/streak.png` |
| Transaction – Salary | `salary.png` | `assets/icons/salary.png` |
| Transaction – Food | `food.png` | `assets/icons/food.png` |
| Transaction – Transport | `transport.png` | `assets/icons/transport.png` |
| Transaction – Entertainment | `entertainment.png` | `assets/icons/entertainment.png` |

---

## Missing Icons (Optional / Future)

Icons that would improve or extend the Home screen:

| Icon | Purpose | Priority |
|------|---------|----------|
| `plus.png` | Add Income button (if distinct from `income.png`) | Low |
| `minus.png` | Add Expense button (if distinct from `expense.png`) | Low |
| `chevron-right.png` | “See All” link | Low |
| `level.png` | Level badge (or keep as text “Lv.X”) | Low |
| **Category icons** (for other transaction types): | | |
| `shopping.png` | Shopping category | Medium |
| `bills.png` | Bills / Utilities | Medium |
| `healthcare.png` | Healthcare | Medium |
| `education.png` | Education | Medium |
| `other.png` | Default / Other category | Medium |

---

## Asset Structure Expected

```
assets/
├── image/
│   └── genie-pet.png
└── icons/
    ├── income.png
    ├── expense.png
    ├── notification.png
    ├── spark.png
    ├── streak.png
    ├── salary.png
    ├── food.png
    ├── transport.png
    └── entertainment.png
```
