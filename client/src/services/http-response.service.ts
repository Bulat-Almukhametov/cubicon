import { HttpResponseStatusCode } from "../enums";

export const handleResponses = (responses: Response[]) => {
    const failedResponse = responses.find(r => !!r && r.status !== HttpResponseStatusCode.OK && r.status !== HttpResponseStatusCode.NoContent);
    if (failedResponse)
        throw new Error(failedResponse.status.toString());

    const noContentResponse = responses.find(r => !!r && r.status === HttpResponseStatusCode.NoContent);
    if (noContentResponse)
        throw new Error(HttpResponseStatusCode.NoContent.toString());
}

