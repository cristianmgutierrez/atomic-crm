import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Welcome = () => (
  <Card>
    <CardHeader className="px-4">
      <CardTitle>EuInvisto.club</CardTitle>
    </CardHeader>
    <CardContent className="px-4">
      <p className="text-sm">
        Feito por especialistas do mercado, para especialistas do mercado.
      </p>
    </CardContent>
  </Card>
);
