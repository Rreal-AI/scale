import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { orderEvents, orders } from "@/db/schema";
import { and, eq, ilike, gte, lte, desc, count, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - User ID required" },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: "Forbidden - Organization ID required" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const offset = (page - 1) * limit;

    const search = searchParams.get("search") || undefined;
    const event_type = searchParams.get("event_type") || undefined;
    const date_from = searchParams.get("date_from") || undefined;
    const date_to = searchParams.get("date_to") || undefined;
    const order_id = searchParams.get("order_id") || undefined;

    const validEventTypes = [
      "created",
      "weight_verified",
      "visual_verified",
      "status_changed",
      "archived",
      "unarchived",
    ];
    const finalEventType =
      event_type && validEventTypes.includes(event_type)
        ? event_type
        : undefined;

    const conditions: ReturnType<typeof eq>[] = [eq(orderEvents.org_id, orgId)];

    if (finalEventType) {
      conditions.push(
        eq(orderEvents.event_type, finalEventType as typeof orderEvents.event_type.enumValues[number])
      );
    }

    if (date_from) {
      try {
        const fromDate = new Date(date_from);
        conditions.push(gte(orderEvents.created_at, fromDate));
      } catch (e) {
        console.error("Invalid date_from:", e);
      }
    }

    if (date_to) {
      try {
        const toDate = new Date(date_to);
        toDate.setDate(toDate.getDate() + 1);
        conditions.push(lte(orderEvents.created_at, toDate));
      } catch (e) {
        console.error("Invalid date_to:", e);
      }
    }

    if (order_id) {
      conditions.push(eq(orderEvents.order_id, order_id));
    }

    if (search) {
      const matchingOrders = await db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(eq(orders.org_id, orgId), ilike(orders.check_number, `%${search}%`))
        );

      if (matchingOrders.length > 0) {
        conditions.push(
          inArray(
            orderEvents.order_id,
            matchingOrders.map((o) => o.id)
          )
        );
      } else {
        return NextResponse.json({
          events: [],
          pagination: {
            page,
            limit,
            total_count: 0,
            total_pages: 0,
            has_next_page: false,
            has_previous_page: false,
          },
        });
      }
    }

    const [eventsList, totalCountResult] = await Promise.all([
      db.query.orderEvents.findMany({
        where: and(...conditions),
        orderBy: [desc(orderEvents.created_at)],
        limit,
        offset,
        with: {
          order: {
            columns: {
              check_number: true,
              customer_name: true,
              status: true,
            },
          },
        },
      }),
      db
        .select({ count: count() })
        .from(orderEvents)
        .where(and(...conditions)),
    ]);

    const total_count = totalCountResult[0]?.count || 0;
    const total_pages = Math.ceil(total_count / limit);

    return NextResponse.json({
      events: eventsList,
      pagination: {
        page,
        limit,
        total_count,
        total_pages,
        has_next_page: page < total_pages,
        has_previous_page: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching order events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
