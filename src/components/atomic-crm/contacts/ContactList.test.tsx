import { render } from "vitest-browser-react";

import {
  DesktopEmpty,
  DesktopSuccess,
  DesktopLoading,
  DesktopError,
  BulkTagButton,
} from "./ContactList.stories";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ContactList", () => {
  it("renders an invite to create the first contact when the app is empty", async () => {
    const screen = await render(<DesktopEmpty />);
    await expect
      .element(screen.getByRole("heading", { name: "No contacts found" }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("It seems your contact list is empty."))
      .toBeVisible();
  });

  it("renders contacts in a list", async () => {
    const screen = await render(<DesktopSuccess />);

    // Pipedrive-style table splits first/last name into separate cells.
    await expect
      .element(screen.getByText("Ada", { exact: true }))
      .toBeVisible();
    await expect
      .element(screen.getByText("Lovelace", { exact: true }))
      .toBeVisible();
    await expect
      .element(screen.getByText("Grace", { exact: true }))
      .toBeVisible();
    await expect
      .element(screen.getByText("Hopper", { exact: true }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("heading", { name: "No contacts found" }))
      .not.toBeInTheDocument();
  });

  /**
   * The desktop version doesn't show a skeleton yet
   */
  it.skip("renders a skeleton while loading", async () => {
    const screen = await render(<DesktopLoading />);

    await expect
      .poll(() => screen.container.querySelector('[data-slot="skeleton"]'))
      .not.toBeNull();
  });

  it("renders an error notification when loading contacts fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const screen = await render(<DesktopError />);

    await expect
      .element(screen.getByText("Error loading contacts"))
      .toBeVisible();
  });

  it("shows the bulk tag button only after selecting contacts", async () => {
    const screen = await render(<BulkTagButton />);

    await expect
      .element(screen.getByRole("button", { name: /^tag$/i }))
      .not.toBeInTheDocument();

    await expect
      .poll(() => getSelectionCheckboxes(screen.container).length)
      .toBe(2);

    const [selectionCheckbox] = getSelectionCheckboxes(screen.container);
    await selectionCheckbox.click();

    await expect
      .element(screen.getByRole("button", { name: /^tag$/i }))
      .toBeVisible();
  });

  it("adds an existing tag to selected contacts without duplicating it", async () => {
    const screen = await render(<BulkTagButton />);

    await expect
      .poll(() => getSelectionCheckboxes(screen.container).length)
      .toBe(2);

    const checkboxes = getSelectionCheckboxes(screen.container);
    await checkboxes[0].click();
    await checkboxes[1].click();

    await screen.getByRole("button", { name: /^tag$/i }).click();
    await screen.getByRole("button", { name: "VIP" }).click();

    // The notification "Tag added to 1 contact" confirms the bulk action:
    // only Grace was updated (Ada already had the VIP tag — no duplication).
    await expect
      .element(screen.getByText("Tag added to 1 contact"))
      .toBeInTheDocument();
    // close the notification
    await screen.getByRole("button", { name: /close/i }).click();
  });

  it("creates a new tag inline and applies it to the full selected list", async () => {
    const screen = await render(<BulkTagButton />);

    await expect
      .poll(() => getSelectionCheckboxes(screen.container).length)
      .toBe(2);

    const checkboxes = getSelectionCheckboxes(screen.container);
    await checkboxes[0].click();
    await checkboxes[1].click();

    await screen.getByRole("button", { name: /^Tag$/ }).click();
    await screen.getByRole("button", { name: /Create new tag/ }).click();

    await expect
      .element(
        screen.getByText(
          "Create a new tag and apply it to the selected contacts.",
        ),
      )
      .toBeVisible();

    await screen.getByLabelText("Tag name").fill("Prospect");
    await screen.getByRole("button", { name: /^Save$/ }).click();

    // The notification "Tag added to 2 contacts" confirms both Ada and Grace
    // received the newly created Prospect tag via the bulk action.
    await expect
      .element(screen.getByText("Tag added to 2 contacts"))
      .toBeInTheDocument();
    // close the notification
    await screen.getByRole("button", { name: /close/i }).click();
  });
});

// Skips the "select all" header checkbox so tests operate on row checkboxes only.
const getSelectionCheckboxes = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-slot="checkbox"]'))
    .slice(1)
    .map((element) => element as HTMLElement);
