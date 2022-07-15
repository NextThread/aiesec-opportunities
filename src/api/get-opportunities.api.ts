import {
  doc,
  getDoc,
  query,
  onSnapshot,
  QueryConstraint,
  QuerySnapshot,
  where,
  getDocsFromCache,
  getDocsFromServer,
} from "firebase/firestore";
import type {
  Opportunity,
  OpportunityResponse,
  OGXFunctionOrMultiple,
  QueryCountry,
  QueryPeriod,
} from "@/types";
import { opportunityCollection } from "@/firebase.config";

export async function getOpportunityById(id: string) {
  const opportunityRef = doc(opportunityCollection, id);
  const opportunity = await getDoc(opportunityRef);
  if (opportunity.exists())
    return { ...opportunity.data(), id: opportunity.id };
  else return undefined;
}

let dbUpdated = true;

onSnapshot(opportunityCollection, () => {
  dbUpdated = true;
});

export async function getOpportunities({
  type,
  country,
  begin,
  end,
}: {
  type: OGXFunctionOrMultiple;
  country: QueryCountry;
  begin: QueryPeriod | undefined;
  end: QueryPeriod | undefined;
}) {
  const opportunities: Opportunity[] = [];
  const conditions: QueryConstraint[] = [];
  let snapshot: QuerySnapshot<OpportunityResponse>;
  if (type !== "all") {
    conditions.push(where("function", "==", type));
  }
  if (country !== "") {
    conditions.push(where("country", "==", country));
  }
  const q = query(opportunityCollection, ...conditions);
  if (!dbUpdated) {
    try {
      snapshot = await getDocsFromCache(q);
      console.log("Got from cache");
    } catch {
      snapshot = await getDocsFromServer(q);
      console.log("Got from server");
    }
  } else {
    snapshot = await getDocsFromServer(q);
    console.log("Got from server");
  }

  if (!end && !begin) {
    snapshot.docs.forEach((doc) => {
      const id = doc.id;
      const data = doc.data();
      opportunities.push({
        ...data,
        id,
      });
    });
  } else {
    const beginDate = begin
      ? new Date(begin.year, begin.month)
      : end
      ? new Date(end.year - 2, 0)
      : new Date(Date.now());
    const endDate = end
      ? new Date(end.year, end.month)
      : begin
      ? new Date(begin.year + 2, 0)
      : new Date(Date.now() + 1000 * 60 * 60 * 24 * 31 * 12 * 2);

    opportunities.push(
      ...(await filterByTimeSlots(snapshot, {
        begin: beginDate,
        end: endDate,
      }))
    );
  }
  dbUpdated = false;
  return opportunities;
}

async function filterByTimeSlots(
  querySnapshot: QuerySnapshot<OpportunityResponse>,
  period: { begin: Date; end: Date }
) {
  const opportunities: Opportunity[] = [];
  querySnapshot.docs.forEach((doc) => {
    const id = doc.id;
    const data = doc.data();
    const timeslots = data.timeslots;
    const timeslotsWhereFilterMatches = timeslots.filter((timeslot) => {
      return (
        timeslot.begin.toDate().getTime() >= period.begin.getTime() &&
        timeslot.end.toDate().getTime() <= period.end.getTime()
      );
    });
    if (timeslotsWhereFilterMatches.length !== 0) {
      opportunities.push({
        ...data,
        id,
      });
    }
  });
  return opportunities;
}
