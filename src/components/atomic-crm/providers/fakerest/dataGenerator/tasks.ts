import { datatype, lorem, random } from "faker/locale/en_US";

import { defaultTaskTypes } from "../../../root/defaultConfiguration";
import type { Task } from "../../../types";
import type { Db } from "./types";
import { randomDate } from "./utils";

export const type: string[] = [
  "email",
  "email",
  "email",
  "email",
  "email",
  "email",
  "call",
  "call",
  "call",
  "call",
  "call",
  "call",
  "call",
  "call",
  "call",
  "call",
  "call",
  "demo",
  "lunch",
  "meeting",
  "follow-up",
  "follow-up",
  "thank-you",
  "ship",
  "none",
];

export const generateTasks = (db: Db) => {
  const openTasks: Task[] = Array.from(Array(400).keys()).map<Task>((id) => {
    const contact = random.arrayElement(db.contacts);
    contact.nb_tasks++;
    const dueDate = randomDate(
      datatype.boolean() ? new Date() : new Date(contact.first_seen),
      new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
    );
    return {
      id,
      contact_id: contact.id,
      type: random.arrayElement(defaultTaskTypes).value,
      text: lorem.sentence(),
      due_date: dueDate.toISOString().slice(0, 10),
      end_date: dueDate.toISOString().slice(0, 10),
      start_time: undefined,
      end_time: undefined,
      notes: undefined,
      deal_id: undefined,
      done_date: undefined,
      sales_id: 0,
      source: "manual",
    };
  });

  // Observation tasks vinculadas a contatos (substituem as antigas contact_notes).
  const contactObservations: Task[] = Array.from(Array(1200).keys()).map<Task>(
    (i) => {
      const id = openTasks.length + i;
      const contact = random.arrayElement(db.contacts);
      contact.nb_tasks++;
      const date = randomDate(new Date(contact.first_seen));
      contact.last_seen =
        date > new Date(contact.last_seen)
          ? date.toISOString()
          : contact.last_seen;
      return {
        id,
        contact_id: contact.id,
        type: "observation",
        text: undefined,
        notes: lorem.paragraphs(datatype.number({ min: 1, max: 4 })),
        due_date: date.toISOString().slice(0, 10),
        end_date: date.toISOString().slice(0, 10),
        start_time: undefined,
        end_time: undefined,
        deal_id: undefined,
        done_date: date.toISOString(),
        sales_id: contact.sales_id,
        source: "migrated_note",
      };
    },
  );

  // Observation tasks vinculadas a deals (substituem as antigas deal_notes).
  const dealObservations: Task[] = Array.from(Array(300).keys()).map<Task>(
    (i) => {
      const id = openTasks.length + contactObservations.length + i;
      const deal = random.arrayElement(db.deals);
      const contactId = deal.contact_ids?.[0];
      const contact =
        contactId != null
          ? db.contacts[contactId as number]
          : random.arrayElement(db.contacts);
      contact.nb_tasks++;
      const date = randomDate(new Date(deal.created_at));
      contact.last_seen =
        date > new Date(contact.last_seen)
          ? date.toISOString()
          : contact.last_seen;
      return {
        id,
        contact_id: contact.id,
        deal_id: deal.id,
        type: "observation",
        text: undefined,
        notes: lorem.paragraphs(datatype.number({ min: 1, max: 4 })),
        due_date: date.toISOString().slice(0, 10),
        end_date: date.toISOString().slice(0, 10),
        start_time: undefined,
        end_time: undefined,
        done_date: date.toISOString(),
        sales_id: deal.sales_id,
        source: "migrated_note",
      };
    },
  );

  return [...openTasks, ...contactObservations, ...dealObservations];
};
