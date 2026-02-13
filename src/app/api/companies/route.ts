import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authConfig, type AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

// Schema para pesquisa
const searchQuerySchema = z.object({
  query: z.string().optional().nullable(),
  page: z.string().optional().nullable().transform((val) => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().nullable().transform((val) => val ? parseInt(val, 10) : 20),
}).transform((data) => ({
  query: data.query || undefined,
  page: Math.max(1, data.page),
  limit: Math.min(50, Math.max(1, data.limit)),
}));

// Schema para criação
const createCompanySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório.").max(255),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email("Email inválido.").optional().or(z.literal("")),
  nif: z.string().max(20).optional(),
});

/**
 * GET /api/companies
 * Pesquisa empresas por nome (case-insensitive)
 */
export async function GET(req: NextRequest) {
  const session = (await getServerSession(authConfig)) as AppSession | null;

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (session.user.role !== "SALES" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const parseResult = searchQuerySchema.safeParse({
    query: searchParams.get("query"),
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Parâmetros inválidos.", details: parseResult.error.format() },
      { status: 422 }
    );
  }

  const { query, page, limit } = parseResult.data;
  const skip = (page - 1) * limit;

  try {
    // MySQL já é case-insensitive por padrão, não precisa do mode
    const whereClause = query
      ? {
          name: {
            contains: query,
          },
        }
      : {};

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          email: true,
          nif: true,
          createdAt: true,
          _count: {
            select: {
              visits: true,
              sales: true,
            },
          },
        },
      }),
      prisma.company.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      companies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao pesquisar empresas:", error);
    return NextResponse.json(
      { error: "Erro ao pesquisar empresas." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/companies
 * Cria uma nova empresa
 */
export async function POST(req: NextRequest) {
  const session = (await getServerSession(authConfig)) as AppSession | null;

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (session.user.role !== "SALES" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parseResult = createCompanySchema.safeParse(json);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parseResult.error.format() },
      { status: 422 }
    );
  }

  const payload = parseResult.data;

  try {
    // Verificar se já existe empresa com o mesmo nome
    // MySQL já é case-insensitive por padrão
    const existingCompany = await prisma.company.findFirst({
      where: {
        name: payload.name,
      },
    });

    if (existingCompany) {
      return NextResponse.json(
        { 
          error: "Já existe uma empresa com este nome.",
          existingCompany: {
            id: existingCompany.id,
            name: existingCompany.name,
          }
        },
        { status: 409 }
      );
    }

    const company = await prisma.company.create({
      data: {
        name: payload.name,
        address: payload.address,
        phone: payload.phone,
        email: payload.email || undefined,
        nif: payload.nif,
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "company.create",
      req,
      metadata: {
        companyId: company.id,
        companyName: company.name,
      },
    });

    return NextResponse.json(
      {
        company: {
          id: company.id,
          name: company.name,
          address: company.address,
          phone: company.phone,
          email: company.email,
          nif: company.nif,
          createdAt: company.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar empresa:", error);
    return NextResponse.json(
      { error: "Erro ao criar empresa." },
      { status: 500 }
    );
  }
}
