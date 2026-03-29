import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, image_urls, post_to_fb, post_to_ig } = await req.json();

    const FB_PAGE_TOKEN = Deno.env.get("FB_PAGE_ACCESS_TOKEN");
    const FB_PAGE_ID = Deno.env.get("FB_PAGE_ID");
    const IG_ACCOUNT_ID = Deno.env.get("IG_BUSINESS_ACCOUNT_ID");

    const results: any = { fb: null, ig: null };

    // Post to Facebook Page
    if (post_to_fb && FB_PAGE_TOKEN && FB_PAGE_ID) {
      try {
        const fbBody: any = { message: text, access_token: FB_PAGE_TOKEN };

        if (image_urls && image_urls.length > 0) {
          if (image_urls.length === 1) {
            // Single photo post
            const res = await fetch(`https://graph.facebook.com/v19.0/${FB_PAGE_ID}/photos`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...fbBody, url: image_urls[0] }),
            });
            results.fb = await res.json();
          } else {
            // Multi-photo post: upload each, then create post
            const photoIds: string[] = [];
            for (const url of image_urls.slice(0, 4)) {
              const res = await fetch(`https://graph.facebook.com/v19.0/${FB_PAGE_ID}/photos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, access_token: FB_PAGE_TOKEN, published: false }),
              });
              const data = await res.json();
              if (data.id) photoIds.push(data.id);
            }
            const attachedMedia = photoIds.map((id) => ({ media_fbid: id }));
            const res = await fetch(`https://graph.facebook.com/v19.0/${FB_PAGE_ID}/feed`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: text, attached_media: attachedMedia, access_token: FB_PAGE_TOKEN }),
            });
            results.fb = await res.json();
          }
        } else {
          // Text-only post
          const res = await fetch(`https://graph.facebook.com/v19.0/${FB_PAGE_ID}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fbBody),
          });
          results.fb = await res.json();
        }
      } catch (e: any) {
        results.fb = { error: e.message };
      }
    }

    // Post to Instagram Business
    if (post_to_ig && FB_PAGE_TOKEN && IG_ACCOUNT_ID) {
      try {
        if (image_urls && image_urls.length > 0) {
          if (image_urls.length === 1) {
            // Single image container
            const createRes = await fetch(`https://graph.facebook.com/v19.0/${IG_ACCOUNT_ID}/media`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image_url: image_urls[0], caption: text, access_token: FB_PAGE_TOKEN }),
            });
            const container = await createRes.json();
            if (container.id) {
              const pubRes = await fetch(`https://graph.facebook.com/v19.0/${IG_ACCOUNT_ID}/media_publish`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ creation_id: container.id, access_token: FB_PAGE_TOKEN }),
              });
              results.ig = await pubRes.json();
            } else {
              results.ig = container;
            }
          } else {
            // Carousel
            const children: string[] = [];
            for (const url of image_urls.slice(0, 10)) {
              const res = await fetch(`https://graph.facebook.com/v19.0/${IG_ACCOUNT_ID}/media`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: FB_PAGE_TOKEN }),
              });
              const data = await res.json();
              if (data.id) children.push(data.id);
            }
            const carouselRes = await fetch(`https://graph.facebook.com/v19.0/${IG_ACCOUNT_ID}/media`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ media_type: "CAROUSEL", children: children, caption: text, access_token: FB_PAGE_TOKEN }),
            });
            const carousel = await carouselRes.json();
            if (carousel.id) {
              const pubRes = await fetch(`https://graph.facebook.com/v19.0/${IG_ACCOUNT_ID}/media_publish`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ creation_id: carousel.id, access_token: FB_PAGE_TOKEN }),
              });
              results.ig = await pubRes.json();
            } else {
              results.ig = carousel;
            }
          }
        }
      } catch (e: any) {
        results.ig = { error: e.message };
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
