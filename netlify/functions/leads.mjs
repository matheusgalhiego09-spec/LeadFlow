export default async (request) => {
    try {
        const url = new URL(request.url);

        const city = url.searchParams.get("city");
        const category = url.searchParams.get("category");
        const limit = Math.min(
            Number(url.searchParams.get("limit")) || 20,
            50
        );

        if (!city || !category) {
            return Response.json(
                { error: "Informe cidade e categoria." },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEOAPIFY_API_KEY;

        if (!apiKey) {
            return Response.json(
                { error: "Chave da Geoapify não configurada." },
                { status: 500 }
            );
        }

        // 1. Encontrar a cidade
        const geoParams = new URLSearchParams({
            text: city,
            format: "json",
            limit: "1",
            apiKey
        });

        const geoResponse = await fetch(
            `https://api.geoapify.com/v1/geocode/search?${geoParams}`
        );

        if (!geoResponse.ok) {
            throw new Error("Erro ao localizar a cidade.");
        }

        const geoData = await geoResponse.json();

        if (!geoData.results?.length) {
            return Response.json(
                { error: "Cidade não encontrada." },
                { status: 404 }
            );
        }

        const { lat, lon } = geoData.results[0];

        // 2. Buscar estabelecimentos reais
        const placesParams = new URLSearchParams({
            categories: category,
            filter: `circle:${lon},${lat},12000`,
            bias: `proximity:${lon},${lat}`,
            limit: String(limit),
            apiKey
        });

        const placesResponse = await fetch(
            `https://api.geoapify.com/v2/places?${placesParams}`
        );

        if (!placesResponse.ok) {
            throw new Error("Erro ao consultar estabelecimentos.");
        }

        const placesData = await placesResponse.json();

        // 3. Organizar os dados para o LeadFlow
        const leads = (placesData.features || [])
            .map(feature => {

                const p = feature.properties || {};
                const raw = p.datasource?.raw || {};

                return {
                    id: p.place_id || crypto.randomUUID(),

                    name:
                        p.name ||
                        raw.name ||
                        "Empresa sem nome",

                    category:
                        raw.shop ||
                        raw.amenity ||
                        category,

                    phone:
                        p.contact?.phone ||
                        raw.phone ||
                        raw["contact:phone"] ||
                        "",

                    website:
                        p.website ||
                        p.contact?.website ||
                        raw.website ||
                        raw["contact:website"] ||
                        "",

                    city:
                        p.city ||
                        p.county ||
                        city,

                    address:
                        p.formatted ||
                        p.address_line2 ||
                        "",

                    status: "Novo",
                    note: ""
                };
            })

            // Não queremos "leads" sem nome
            .filter(lead =>
                lead.name !== "Empresa sem nome"
            );

        return Response.json({
            count: leads.length,
            results: leads
        });

    } catch (error) {

        console.error(error);

        return Response.json(
            {
                error:
                    "Não foi possível buscar os estabelecimentos."
            },
            { status: 500 }
        );
    }
};